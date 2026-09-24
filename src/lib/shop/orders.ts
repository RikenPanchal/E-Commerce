import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Order, { type OrderDocument } from "@/models/Order";
import Product from "@/models/Product";
import { evaluateCoupon, recordCouponUsage } from "@/lib/shop/coupons";
import { calculateShippingCost } from "@/lib/shop/shipping";
import { processBackInStockTransition } from "@/lib/shop/backInStock";
import { createRazorpayOrder, verifyPaymentSignature, type CreatedRazorpayOrder } from "@/lib/payments/razorpay";
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
    paymentStatus: order.paymentStatus,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    paidAt: order.paidAt ? order.paidAt.toISOString() : undefined,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    shippedAt: order.shippedAt ? order.shippedAt.toISOString() : undefined,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : undefined,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : undefined,
    createdAt: order.createdAt.toISOString(),
  };
}

export type PlaceOrderResult =
  | { order: OrderDocument; razorpayOrder: CreatedRazorpayOrder }
  | { error: string };

/**
 * Re-validates every line against live product data (never trusts client-sent
 * price/name), then decrements stock atomically per item so two concurrent
 * checkouts can't oversell the same unit. Standalone MongoDB (no replica set)
 * doesn't support multi-document transactions here, so failures are rolled
 * back manually instead.
 *
 * Stock is reserved here, before payment - the same "never oversell" rigor
 * this function already had for COD applies just as much now that the
 * customer is about to be sent to Razorpay Checkout. If they never
 * complete payment, `failOrderPayment` below releases it back; see that
 * function's own comment for what happens if they abandon checkout
 * without even that being called.
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

  // Generated up front (not left to Mongo's auto-`_id`) so it can be used
  // as the Razorpay order's `receipt` *before* this document exists -
  // letting the Razorpay order be created first and this one created with
  // `razorpayOrderId` already set, in a single write, rather than a
  // create-then-update pair that could fail (or be read) in between.
  const orderId = new Types.ObjectId();

  let razorpayOrder: CreatedRazorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      amountInRupees: total,
      receipt: orderId.toString(),
      notes: { userId, ...(couponCode ? { couponCode } : {}) },
    });
  } catch (error) {
    await rollback();
    console.error("Failed to create Razorpay order:", error);
    return { error: "Could not start payment. Please try again." };
  }

  // Coupon usage is recorded once payment is actually confirmed
  // (`finalizeOrderPayment`), not here - this order isn't paid for yet, and
  // may never be (abandoned checkout, declined payment). Recording it now
  // would burn the customer's redemption on a checkout that never
  // completed.
  try {
    const order = await Order.create({
      _id: orderId,
      user: userId,
      items: orderItems,
      shippingAddress: input.shippingAddress,
      subtotal,
      couponCode,
      discountAmount,
      shippingCost,
      total,
      status: "pending",
      paymentProvider: "razorpay",
      paymentStatus: "pending",
      razorpayOrderId: razorpayOrder.id,
    });
    return { order, razorpayOrder };
  } catch (error) {
    await rollback();
    throw error;
  }
}

export interface RestockedItem {
  productId: string;
  variantId: string | null;
  oldStock: number;
  newStock: number;
}

/**
 * Restores stock for every line in an already-created order - shared by
 * admin cancellation (src/lib/admin/orders.ts) and a failed/abandoned
 * payment (`failOrderPayment` below), so there is exactly one
 * implementation of "give this order's reserved stock back" for both to
 * ever disagree with. Returns what changed so the caller can fire
 * back-in-stock notifications - never fires them itself, since callers
 * differ on exactly when that's appropriate.
 */
export async function restockOrderItems(order: OrderDocument): Promise<RestockedItem[]> {
  const productIds = [...new Set(order.items.map((item) => item.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const restocked = await Promise.all(
    order.items.map(async (item) => {
      const product = productMap.get(item.product.toString());
      if (!product) return null; // Deleted since the order was placed - nothing to restock.

      if (item.variantId) {
        const variantId = item.variantId.toString();
        const variant = product.variants.find((entry) => entry._id.toString() === variantId);
        const oldStock = variant?.stock ?? 0;
        await Product.updateOne(
          { _id: item.product },
          { $inc: { "variants.$[target].stock": item.quantity, stock: item.quantity } },
          { arrayFilters: [{ "target._id": variantId }] }
        );
        return { productId: item.product.toString(), variantId, oldStock, newStock: oldStock + item.quantity };
      }

      const oldStock = product.stock;
      await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
      return { productId: item.product.toString(), variantId: null, oldStock, newStock: oldStock + item.quantity };
    })
  );

  return restocked.filter((entry): entry is RestockedItem => entry !== null);
}

export type FinalizePaymentResult = { order: OrderDocument; alreadyPaid: boolean } | { error: string };

/**
 * Verifies a Razorpay payment against this exact order and marks it paid -
 * idempotent (a second call once it's already paid just returns the order
 * with `alreadyPaid: true` rather than re-verifying/re-crediting coupon
 * usage), since both the client's own post-payment call and the Razorpay
 * webhook can race to report the same successful payment.
 *
 * Two different callers, two different proofs of authenticity:
 *  - Checkout's own client-side success handler hands back an
 *    order_id|payment_id HMAC signature, checked here via
 *    `verifyPaymentSignature`.
 *  - The webhook route has no such per-payment signature to check - it
 *    instead verifies the *whole webhook request* is genuinely from
 *    Razorpay (see verifyWebhookSignature) before ever calling this, so it
 *    passes `skipSignatureCheck: true` rather than a signature it was
 *    never given.
 */
export async function finalizeOrderPayment(
  order: OrderDocument,
  input: { razorpayPaymentId: string } & (
    | { razorpaySignature: string; skipSignatureCheck?: false }
    | { razorpaySignature?: string; skipSignatureCheck: true }
  )
): Promise<FinalizePaymentResult> {
  if (order.paymentStatus === "paid") {
    return { order, alreadyPaid: true };
  }
  if (!order.razorpayOrderId) {
    return { error: "This order was never set up for online payment." };
  }
  if (order.status === "cancelled") {
    return { error: "This order was already cancelled and can no longer be paid." };
  }

  if (!input.skipSignatureCheck) {
    const isValid = verifyPaymentSignature({
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    });
    if (!isValid) {
      return { error: "Payment verification failed. If any amount was deducted, it will be refunded automatically." };
    }
  }

  order.paymentStatus = "paid";
  order.razorpayPaymentId = input.razorpayPaymentId;
  order.paidAt = new Date();
  await order.save();

  if (order.couponCode) {
    await recordCouponUsage(order.couponCode);
  }

  return { order, alreadyPaid: false };
}

export type FailPaymentResult = { order: OrderDocument; alreadyResolved: boolean };

/**
 * Releases an order's reserved stock and marks it cancelled / payment
 * failed - idempotent (a paid or already-cancelled order is left
 * untouched), since the checkout modal being dismissed, an explicit
 * payment failure, and the Razorpay webhook's own `payment.failed` event
 * can all race to call this for the same abandoned checkout.
 *
 * What this does *not* cover: a customer who closes the tab before any of
 * those ever fire (no dismiss/failure event, no payment attempt for
 * Razorpay to report). That order is left `pending`/reserved - the
 * scheduled job at src/app/api/cron/expire-pending-orders releases it
 * after a time limit, which is the actual safety net for that case.
 */
export async function failOrderPayment(order: OrderDocument): Promise<FailPaymentResult> {
  if (order.paymentStatus === "paid" || order.status === "cancelled") {
    return { order, alreadyResolved: true };
  }

  const restocked = await restockOrderItems(order);

  order.paymentStatus = "failed";
  order.status = "cancelled";
  order.cancelledAt = new Date();
  await order.save();

  if (restocked.length > 0) {
    await Promise.all(
      restocked.map((entry) =>
        processBackInStockTransition(entry.productId, entry.variantId, entry.oldStock, entry.newStock)
      )
    );
  }

  return { order, alreadyResolved: false };
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

/** The raw document (not the mapped view) for a user's own order - used by
 *  the payment verify/cancel routes, which need to mutate and `.save()` it
 *  via `finalizeOrderPayment`/`failOrderPayment`. Ownership-checked the
 *  same way `getOrderForUser` is, so a customer can only ever finalize or
 *  fail their own order. */
export async function getOrderDocumentForUser(userId: string, orderId: string): Promise<OrderDocument | null> {
  if (!isValidObjectId(orderId)) {
    return null;
  }
  await connectDB();
  return Order.findOne({ _id: orderId, user: userId });
}

/** Looked up by Razorpay's own order id, not ours - the only identifier a
 *  webhook event payload actually carries. No ownership check (there's no
 *  authenticated user on a webhook request) - trustworthiness instead comes
 *  entirely from the caller having already verified the webhook's HMAC
 *  signature before ever calling this. */
export async function getOrderDocumentByRazorpayOrderId(razorpayOrderId: string): Promise<OrderDocument | null> {
  await connectDB();
  return Order.findOne({ razorpayOrderId });
}
