import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Order, { TERMINAL_ORDER_STATUSES, type OrderDocument } from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import { toOrderView } from "@/lib/shop/orders";
import { processBackInStockTransition } from "@/lib/shop/backInStock";
import type { UpdateOrderStatusInput } from "@/lib/validations/order";
import type { OrderView } from "@/types/order";

export interface AdminOrderView extends OrderView {
  customerName: string;
  customerEmail: string;
}

async function attachCustomer(order: OrderDocument): Promise<AdminOrderView> {
  const user = await User.findById(order.user).select("name email");
  return {
    ...toOrderView(order),
    customerName: user?.name ?? order.shippingAddress.fullName,
    customerEmail: user?.email ?? "-",
  };
}

export async function getAllOrdersForAdmin(limit = 200): Promise<AdminOrderView[]> {
  await connectDB();
  const orders = await Order.find().sort({ createdAt: -1 }).limit(limit);

  const userIds = [...new Set(orders.map((order) => order.user.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("name email");
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  return orders.map((order) => {
    const user = userMap.get(order.user.toString());
    return {
      ...toOrderView(order),
      customerName: user?.name ?? order.shippingAddress.fullName,
      customerEmail: user?.email ?? "-",
    };
  });
}

export async function getOrderForAdmin(orderId: string): Promise<AdminOrderView | null> {
  if (!isValidObjectId(orderId)) {
    return null;
  }
  await connectDB();
  const order = await Order.findById(orderId);
  return order ? attachCustomer(order) : null;
}

export type UpdateOrderStatusResult = { order: OrderDocument } | { error: string };

/**
 * Moves an order to a new status. Once an order is `delivered` or
 * `cancelled` it's terminal - restore stock and cancel became a one-way
 * door on purpose, matching how a real fulfillment flow works.
 */
export async function updateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput
): Promise<UpdateOrderStatusResult> {
  if (!isValidObjectId(orderId)) {
    return { error: "Order not found" };
  }
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    return { error: "Order not found" };
  }

  if (TERMINAL_ORDER_STATUSES.includes(order.status)) {
    return { error: `This order is already ${order.status} and can't be changed.` };
  }

  // Populated only when cancelling, and only used after `order.save()`
  // below succeeds, so a back-in-stock notification never fires for a
  // cancellation that didn't actually go through.
  let restocked: { productId: string; variantId: string | null; oldStock: number; newStock: number }[] = [];

  if (input.status === "cancelled") {
    // The order never shipped, so give the stock it reserved back - and,
    // unlike a bare `{ _id: item.product }` filter, a variant line must
    // restore that exact variant's own stock, not just the product's
    // top-level total (mirrors `placeOrder`'s `rollback()` in
    // `src/lib/shop/orders.ts`, the correct existing pattern for this).
    const productIds = [...new Set(order.items.map((item) => item.product.toString()))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    restocked = (
      await Promise.all(
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
      )
    ).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    order.cancelledAt = new Date();
  }

  if (input.status === "shipped") {
    order.shippedAt = new Date();
    if (input.trackingNumber) {
      order.trackingNumber = input.trackingNumber;
    }
    if (input.carrier) {
      order.carrier = input.carrier;
    }
  }

  if (input.status === "delivered") {
    order.deliveredAt = new Date();
  }

  order.status = input.status;
  await order.save();

  if (restocked.length > 0) {
    await Promise.all(
      restocked.map((entry) => processBackInStockTransition(entry.productId, entry.variantId, entry.oldStock, entry.newStock))
    );
  }

  return { order };
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
}

export async function getOrderStats(): Promise<OrderStats> {
  await connectDB();
  const [totalOrders, revenueResult] = await Promise.all([
    Order.countDocuments({ status: { $ne: "cancelled" } }),
    Order.aggregate<{ _id: null; total: number }>([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  return {
    totalOrders,
    totalRevenue: revenueResult[0]?.total ?? 0,
  };
}
