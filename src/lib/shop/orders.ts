import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Order, { type OrderDocument } from "@/models/Order";
import Product from "@/models/Product";
import { evaluateCoupon, recordCouponUsage } from "@/lib/shop/coupons";
import { calculateShippingCost } from "@/lib/shop/shipping";
import type { PlaceOrderInput } from "@/lib/validations/order";
import type { OrderView } from "@/types/order";

export function toOrderView(order: OrderDocument): OrderView {
  return {
    id: order._id.toString(),
    items: order.items.map((item) => ({
      productId: item.product.toString(),
      variantId: item.variantId?.toString(),
      name: item.name,
      price: item.price,
      image: item.image,
      size: item.size,
      color: item.color,
      sku: item.sku,
      quantity: item.quantity,
    })),
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    couponCode: order.couponCode,
    discountAmount: order.discountAmount,
    shippingCost: order.shippingCost,
    total: order.total,
    status: order.status,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    shippedAt: order.shippedAt ? order.shippedAt.toISOString() : undefined,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : undefined,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : undefined,
    createdAt: order.createdAt.toISOString(),
  };
}

export type PlaceOrderResult = { order: OrderDocument } | { error: string };

/**
 * Re-validates every line against live product data (never trusts client-sent
 * price/name), then decrements stock atomically per item so two concurrent
 * checkouts can't oversell the same unit. Standalone MongoDB (no replica set)
 * doesn't support multi-document transactions here, so failures are rolled
 * back manually instead.
 */
export async function placeOrder(userId: string, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  await connectDB();

  const productIds = input.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, isDeleted: false });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const decremented: { productId: string; quantity: number; variantId?: string }[] = [];

  async function rollback() {
    await Promise.all(
      decremented.map((entry) =>
        entry.variantId
          ? Product.updateOne(
              { _id: entry.productId },
              { $inc: { "variants.$[target].stock": entry.quantity, stock: entry.quantity } },
              { arrayFilters: [{ "target._id": entry.variantId }] }
            )
          : Product.updateOne({ _id: entry.productId }, { $inc: { stock: entry.quantity } })
      )
    );
  }

  const orderItems: {
    product: string;
    variantId?: string;
    name: string;
    price: number;
    image?: string;
    size?: string;
    color?: string;
    sku?: string;
    quantity: number;
  }[] = [];

  for (const line of input.items) {
    const product = productMap.get(line.productId);
    if (!product) {
      await rollback();
      return { error: "One of the items in your cart is no longer available." };
    }

    const image = product.media.find((item) => item.type === "image")?.url;

    if (line.variantId) {
      // A variant line never trusts the client's price/size/color/SKU - all
      // of that is re-read from the product's own current variant data,
      // the same authoritative source `resolveVariant` reads on the frontend.
      if (!isValidObjectId(line.variantId)) {
        await rollback();
        return { error: "One of the items in your cart is no longer available." };
      }
      const variant = product.variants.find((item) => item._id.toString() === line.variantId);
      if (!variant) {
        await rollback();
        return { error: "One of the items in your cart is no longer available." };
      }

      // `$elemMatch` + `arrayFilters` (not a bare `"variants._id"` +
      // `"variants.stock"` query with a plain `variants.$`) - two separate
      // conditions on an array field can each be satisfied by a *different*
      // element, so without `$elemMatch` this could match the document
      // because *some* variant has an id and (a possibly different)
      // variant has enough stock, then have the positional `$` update the
      // wrong one entirely.
      const result = await Product.updateOne(
        { _id: product._id, variants: { $elemMatch: { _id: variant._id, stock: { $gte: line.quantity } } } },
        { $inc: { "variants.$[target].stock": -line.quantity, stock: -line.quantity } },
        { arrayFilters: [{ "target._id": variant._id }] }
      );
      if (result.modifiedCount === 0) {
        await rollback();
        return {
          error: `Only ${variant.stock} left of "${product.name}" in this option. Please update your cart.`,
        };
      }
      decremented.push({
        productId: product._id.toString(),
        quantity: line.quantity,
        variantId: variant._id.toString(),
      });

      orderItems.push({
        product: product._id.toString(),
        variantId: variant._id.toString(),
        name: product.name,
        price: variant.price ?? product.price,
        image,
        size: variant.size,
        color: variant.color,
        sku: variant.sku ?? product.sku,
        quantity: line.quantity,
      });
      continue;
    }

    const result = await Product.updateOne(
      { _id: product._id, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    );
    if (result.modifiedCount === 0) {
      await rollback();
      return {
        error: `Only ${product.stock} left of "${product.name}". Please update your cart.`,
      };
    }
    decremented.push({ productId: product._id.toString(), quantity: line.quantity });

    orderItems.push({
      product: product._id.toString(),
      name: product.name,
      price: product.price,
      image,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let couponCode: string | undefined;
  let discountAmount = 0;
  if (input.couponCode) {
    // Re-validated here, server-side, from the same real order lines just
    // built above - never trusting a discount amount the client might have
    // shown during the checkout preview.
    const evaluation = await evaluateCoupon(
      input.couponCode,
      orderItems.map((item) => ({ productId: item.product, variantId: item.variantId, quantity: item.quantity })),
      userId
    );
    if ("error" in evaluation) {
      await rollback();
      return { error: evaluation.error };
    }
    couponCode = evaluation.coupon.code;
    discountAmount = evaluation.coupon.discountAmount;
  }

  // The one and only place the delivery fee is computed for a real order -
  // derived purely from the shipping address that was itself already
  // validated server-side (placeOrderSchema), never from anything the
  // client claims the shipping cost or total should be.
  const shippingCost = calculateShippingCost(input.shippingAddress);
  const total = Math.max(subtotal - discountAmount, 0) + shippingCost;

  try {
    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress: input.shippingAddress,
      subtotal,
      couponCode,
      discountAmount,
      shippingCost,
      total,
      status: "pending",
    });
    if (couponCode) {
      await recordCouponUsage(couponCode);
    }
    return { order };
  } catch (error) {
    await rollback();
    throw error;
  }
}

export async function getOrdersForUser(userId: string, limit = 50): Promise<OrderView[]> {
  await connectDB();
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
  return orders.map(toOrderView);
}

export async function getOrderForUser(userId: string, orderId: string): Promise<OrderView | null> {
  if (!isValidObjectId(orderId)) {
    return null;
  }
  await connectDB();
  const order = await Order.findOne({ _id: orderId, user: userId });
  return order ? toOrderView(order) : null;
}
