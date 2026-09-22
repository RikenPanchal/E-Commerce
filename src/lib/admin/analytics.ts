import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Order, { type OrderStatus } from "@/models/Order";
import User from "@/models/User";

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** UTC midnight, `daysAgo` days back - matching `$dateToString`'s default UTC grouping. */
function utcMidnight(daysAgo: number): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

/** Daily revenue for the last `days` days, zero-filled for days with no orders. */
export async function getRevenueOverTime(days = 30): Promise<RevenuePoint[]> {
  await connectDB();

  // Anchored to UTC, not the server's local timezone - `$dateToString` below
  // groups by UTC calendar day by default, so both sides must agree on what
  // "day" means or days can silently shift by one near midnight.
  const start = utcMidnight(days - 1);

  const results = await Order.aggregate<{ _id: string; revenue: number; orders: number }>([
    { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
  ]);

  const byDate = new Map(results.map((entry) => [entry._id, entry]));

  const points: RevenuePoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const key = formatDateKey(date);
    const entry = byDate.get(key);
    points.push({ date: key, revenue: entry?.revenue ?? 0, orders: entry?.orders ?? 0 });
  }

  return points;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

/** `range` is optional so the existing `/admin` overview call
 *  (`getTopProducts(5)`, all-time) keeps behaving exactly as before -
 *  the new analytics dashboard passes one explicitly to scope this to
 *  the selected date filter. */
export async function getTopProducts(limit = 5, range?: AnalyticsRange): Promise<TopProduct[]> {
  await connectDB();

  const match: Record<string, unknown> = { status: { $ne: "cancelled" } };
  if (range) match.createdAt = { $gte: range.start, $lt: range.end };

  const results = await Order.aggregate<{
    _id: Types.ObjectId;
    name: string;
    quantitySold: number;
    revenue: number;
  }>([
    { $match: match },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $last: "$items.name" },
        quantitySold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);

  return results.map((entry) => ({
    productId: entry._id.toString(),
    name: entry.name,
    quantitySold: entry.quantitySold,
    revenue: entry.revenue,
  }));
}

export interface StatusBreakdownEntry {
  status: OrderStatus;
  count: number;
}

const ALL_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

export async function getOrderStatusBreakdown(): Promise<StatusBreakdownEntry[]> {
  await connectDB();
  const results = await Order.aggregate<{ _id: OrderStatus; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(results.map((entry) => [entry._id, entry.count]));
  return ALL_STATUSES.map((status) => ({ status, count: countMap.get(status) ?? 0 }));
}

/* ==========================================================================
   Analytics dashboard (/admin/analytics) - everything below is additive:
   new exports only, nothing above this line was changed in a way that
   alters existing behavior (`getTopProducts` still returns the exact same
   all-time ranking when called with just a `limit`, as `/admin` itself does).
   ========================================================================== */

export type AnalyticsRangePreset = "today" | "7d" | "30d" | "3m" | "1y" | "custom";

export interface AnalyticsRange {
  start: Date;
  /** Exclusive - a `$lt` bound, so "today" cleanly includes every moment of
   *  today without needing a separate "end of day" fencepost per caller. */
  end: Date;
}

function utcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcEndOfDay(date: Date): Date {
  return new Date(utcStartOfDay(date).getTime() + 24 * 60 * 60 * 1000);
}

function monthsBefore(date: Date, months: number): Date {
  const result = utcStartOfDay(date);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

/**
 * Turns a preset - or an admin-entered custom range - into a concrete
 * `[start, end)` window, always anchored to UTC calendar days (the same
 * anchoring `getRevenueOverTime` already uses for "day", so every chart on
 * this dashboard agrees on what "today" means). An invalid/incomplete
 * custom range (missing a bound, or start after end) falls back to the
 * last 30 days and reports `customRangeInvalid` so the page can say why,
 * rather than silently showing the wrong window.
 */
export function resolveAnalyticsRange(
  preset: AnalyticsRangePreset,
  customStart?: string,
  customEnd?: string
): AnalyticsRange & { customRangeInvalid: boolean } {
  const now = new Date();
  const end = utcEndOfDay(now);

  if (preset === "custom") {
    if (customStart && customEnd) {
      const start = utcStartOfDay(new Date(customStart));
      const customEndDate = utcEndOfDay(new Date(customEnd));
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(customEndDate.getTime()) && start < customEndDate) {
        return { start, end: customEndDate, customRangeInvalid: false };
      }
    }
    return { start: utcStartOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)), end, customRangeInvalid: true };
  }

  const start =
    preset === "today"
      ? utcStartOfDay(now)
      : preset === "7d"
        ? utcStartOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
        : preset === "30d"
          ? utcStartOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000))
          : preset === "3m"
            ? monthsBefore(now, 3)
            : monthsBefore(now, 12);

  return { start, end, customRangeInvalid: false };
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  productsSold: number;
}

/**
 * The dashboard's headline numbers for the selected range, in one
 * aggregation - `{ $sum: { $sum: "$items.quantity" } }` sums each order's
 * own item quantities first (the inner, array-form `$sum`) and then sums
 * those per-order totals across all matched orders (the outer, accumulator
 * `$sum`), which gets `productsSold` without an `$unwind` - unwinding here
 * would multiply every matched order into one row per line item just to
 * throw that shape away again, for no benefit over the array-sum form.
 */
export async function getAnalyticsOverview(range: AnalyticsRange): Promise<AnalyticsOverview> {
  await connectDB();
  const [result] = await Order.aggregate<{ totalRevenue: number; totalOrders: number; productsSold: number }>([
    { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: range.start, $lt: range.end } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$total" },
        totalOrders: { $sum: 1 },
        productsSold: { $sum: { $sum: "$items.quantity" } },
      },
    },
  ]);

  const totalRevenue = result?.totalRevenue ?? 0;
  const totalOrders = result?.totalOrders ?? 0;
  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    productsSold: result?.productsSold ?? 0,
  };
}

/** Orders currently awaiting action - deliberately NOT scoped to the
 *  dashboard's date filter. An order placed before the selected window
 *  that's still pending is exactly as urgent as one placed within it; a
 *  "0" here just because the filter happens to exclude when it was placed
 *  would hide something the admin actually needs to see right now. */
export async function getPendingOrdersCount(): Promise<number> {
  await connectDB();
  return Order.countDocuments({ status: "pending" });
}

/** Day-bucketed revenue/orders for an arbitrary range - the range-aware
 *  sibling of `getRevenueOverTime` (which stays as-is, still used by
 *  `/admin`'s fixed "last 30 days" chart). Returns the exact same
 *  `RevenuePoint` shape, so the dashboard reuses `RevenueChart` unchanged
 *  for both "Revenue over time" and "Orders over time" (each just reads a
 *  different field off the same points). Zero-filled for days with no
 *  orders, same as `getRevenueOverTime`. */
export async function getDailySeries(range: AnalyticsRange): Promise<RevenuePoint[]> {
  await connectDB();

  const results = await Order.aggregate<{ _id: string; revenue: number; orders: number }>([
    { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: range.start, $lt: range.end } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
  ]);

  const byDate = new Map(results.map((entry) => [entry._id, entry]));
  const dayCount = Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000));

  const points: RevenuePoint[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(range.start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = formatDateKey(date);
    const entry = byDate.get(key);
    points.push({ date: key, revenue: entry?.revenue ?? 0, orders: entry?.orders ?? 0 });
  }
  return points;
}

export interface NewCustomersPoint {
  date: string;
  count: number;
}

/** Real signups over the selected range - `role: "user"` only, matching
 *  `getDashboardStats`'s own "customers = users who aren't admins" rule, so
 *  an admin account created for testing never inflates this chart. */
export async function getNewCustomersOverTime(range: AnalyticsRange): Promise<NewCustomersPoint[]> {
  await connectDB();

  const results = await User.aggregate<{ _id: string; count: number }>([
    { $match: { role: "user", createdAt: { $gte: range.start, $lt: range.end } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
  ]);

  const byDate = new Map(results.map((entry) => [entry._id, entry.count]));
  const dayCount = Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000));

  const points: NewCustomersPoint[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(range.start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = formatDateKey(date);
    points.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return points;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  quantitySold: number;
}

/**
 * Real revenue/units per category for the selected range. Order line items
 * only ever snapshot `name`/`price`/`sku` (see `OrderItemAttributes`), never
 * `category` - so this joins against each item's *current* product document
 * to get it, the only place that fact actually lives. A line item whose
 * product has since been permanently deleted has no category to attribute
 * it to and is correctly left out of this specific breakdown (its revenue
 * still counts in `getAnalyticsOverview`/`getDailySeries`, which don't need
 * category at all) - inventing a fallback "Other" bucket for it would mean
 * guessing at data that no longer exists.
 */
export async function getCategoryPerformance(range: AnalyticsRange, limit = 8): Promise<CategoryPerformance[]> {
  await connectDB();

  const results = await Order.aggregate<{ _id: string; revenue: number; quantitySold: number }>([
    { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: range.start, $lt: range.end } } },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        quantitySold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);

  return results.map((entry) => ({ category: entry._id, revenue: entry.revenue, quantitySold: entry.quantitySold }));
}

export interface CouponUsageEntry {
  code: string;
  uses: number;
  totalDiscount: number;
}

/** Real coupon redemptions within the selected range - orders that never
 *  had a coupon applied (`couponCode` unset) are excluded outright, not
 *  counted as a "no coupon" bucket, since this list's job is showing which
 *  real codes were actually used. Returns `[]` (never a placeholder row)
 *  when nothing was redeemed in the window - the page hides this section
 *  entirely rather than showing an empty chart. */
export async function getCouponUsageInRange(range: AnalyticsRange, limit = 8): Promise<CouponUsageEntry[]> {
  await connectDB();

  const results = await Order.aggregate<{ _id: string; uses: number; totalDiscount: number }>([
    {
      $match: {
        status: { $ne: "cancelled" },
        createdAt: { $gte: range.start, $lt: range.end },
        couponCode: { $exists: true, $ne: null },
      },
    },
    { $group: { _id: "$couponCode", uses: { $sum: 1 }, totalDiscount: { $sum: "$discountAmount" } } },
    { $sort: { uses: -1 } },
    { $limit: limit },
  ]);

  return results.map((entry) => ({ code: entry._id, uses: entry.uses, totalDiscount: entry.totalDiscount }));
}
