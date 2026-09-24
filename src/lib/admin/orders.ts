import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Order, { TERMINAL_ORDER_STATUSES, type OrderDocument } from "@/models/Order";
import User from "@/models/User";
import { toOrderView, restockOrderItems } from "@/lib/shop/orders";
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
 *
 * An order whose payment hasn't been confirmed yet (`paymentStatus` isn't
 * `"paid"`) can only ever be moved to `"cancelled"` - there is nothing to
 * process/ship/deliver until Razorpay has actually confirmed the money
 * arrived, and `OrderStatusControl` (the admin UI) already only offers
 * "cancel" as an option in that case, but this is re-checked here too since
 * the UI's own restriction is never the actual authority.
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

  if (input.status !== "cancelled" && order.paymentStatus !== "paid") {
    return { error: "This order's payment hasn't been confirmed yet - it can only be cancelled." };
  }

  // Populated only when cancelling, and only used after `order.save()`
  // below succeeds, so a back-in-stock notification never fires for a
  // cancellation that didn't actually go through.
  let restocked: Awaited<ReturnType<typeof restockOrderItems>> = [];

  if (input.status === "cancelled") {
    // The order never shipped, so give the stock it reserved back - shared
    // with `failOrderPayment` (src/lib/shop/orders.ts), the same restore
    // a failed/abandoned Razorpay payment triggers automatically.
    restocked = await restockOrderItems(order);
    if (order.paymentStatus === "pending") {
      order.paymentStatus = "failed";
    }
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
  // Paid, not just "not cancelled" - an order can now sit at `status:
  // "pending"` while payment is still in flight (or never completes), and
  // counting those as real orders/revenue would overstate both.
  const [totalOrders, revenueResult] = await Promise.all([
    Order.countDocuments({ paymentStatus: "paid" }),
    Order.aggregate<{ _id: null; total: number }>([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  return {
    totalOrders,
    totalRevenue: revenueResult[0]?.total ?? 0,
  };
}
