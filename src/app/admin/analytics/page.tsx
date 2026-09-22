import type { Metadata } from "next";
import Link from "next/link";
import {
  getAnalyticsOverview,
  getCategoryPerformance,
  getCouponUsageInRange,
  getDailySeries,
  getNewCustomersOverTime,
  getPendingOrdersCount,
  getTopProducts,
  resolveAnalyticsRange,
  type AnalyticsRangePreset,
} from "@/lib/admin/analytics";
import { getAdminStockCounts } from "@/lib/admin/products";
import { getDashboardStats } from "@/lib/admin/stats";
import { StatCard } from "@/components/admin/StatCard";
import { TimeSeriesChart } from "@/components/admin/analytics/TimeSeriesChart";
import { TopProductsList } from "@/components/admin/analytics/TopProductsList";
import { RankedBarList } from "@/components/admin/analytics/RankedBarList";
import { formatCurrency } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Analytics",
};

const RANGE_FILTERS: { value: AnalyticsRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "3m", label: "3 Months" },
  { value: "1y", label: "1 Year" },
  { value: "custom", label: "Custom" },
];

const rangeLabelFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function buildRangeHref(preset: AnalyticsRangePreset): string {
  return preset === "30d" ? "/admin/analytics" : `/admin/analytics?range=${preset}`;
}

function isValidPreset(value: string): value is AnalyticsRangePreset {
  return ["today", "7d", "30d", "3m", "1y", "custom"].includes(value);
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawRange = typeof params.range === "string" ? params.range : "30d";
  const rawStart = typeof params.startDate === "string" ? params.startDate : "";
  const rawEnd = typeof params.endDate === "string" ? params.endDate : "";
  const preset = isValidPreset(rawRange) ? rawRange : "30d";

  const range = resolveAnalyticsRange(preset, rawStart, rawEnd);

  const [overview, pendingOrders, stockCounts, dashboardStats, dailySeries, newCustomers, topProducts, categories, coupons] =
    await Promise.all([
      getAnalyticsOverview(range),
      getPendingOrdersCount(),
      getAdminStockCounts(),
      getDashboardStats(),
      getDailySeries(range),
      getNewCustomersOverTime(range),
      getTopProducts(6, range),
      getCategoryPerformance(range),
      getCouponUsageInRange(range),
    ]);

  // `range.end` is exclusive (a `$lt` fencepost) - the last real day it
  // covers is the day before, so the human-readable label subtracts a
  // millisecond rather than showing a date one day past what's actually included.
  const displayEnd = new Date(range.end.getTime() - 1);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-foreground/60">
            {rangeLabelFormatter.format(range.start)} &ndash; {rangeLabelFormatter.format(displayEnd)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGE_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={buildRangeHref(filter.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              preset === filter.value
                ? "border-rose-600 bg-rose-600 text-background"
                : "border-black/10 text-foreground/70 hover:border-rose-300 dark:border-white/15"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {preset === "custom" ? (
        <form
          method="GET"
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.02]"
        >
          <input type="hidden" name="range" value="custom" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-xs font-medium text-foreground/60">
              From
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={rawStart}
              className="h-10 rounded-md border border-black/10 bg-background px-3 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-xs font-medium text-foreground/60">
              To
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={rawEnd}
              className="h-10 rounded-md border border-black/10 bg-background px-3 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-md bg-rose-600 px-5 text-sm font-medium text-background transition-colors hover:bg-rose-500"
          >
            Apply
          </button>
          {range.customRangeInvalid && (rawStart || rawEnd) ? (
            <p className="w-full text-xs text-red-500">
              Enter a valid &ldquo;from&rdquo; date before &ldquo;to&rdquo; - showing the last 30 days instead.
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(overview.totalRevenue)} />
        <StatCard label="Total orders" value={overview.totalOrders} />
        <StatCard label="Total customers" value={dashboardStats.totalCustomers} />
        <StatCard label="Average order value" value={formatCurrency(overview.averageOrderValue)} />
        <StatCard label="Products sold" value={overview.productsSold} />
        <StatCard label="Pending orders" value={pendingOrders} description="Right now, across all time" />
        <StatCard label="Low stock products" value={stockCounts.low} description="Right now, across all time" />
      </div>

      <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Revenue over time</h2>
        <TimeSeriesChart
          data={dailySeries.map((point) => ({ date: point.date, value: point.revenue }))}
          seriesLabel="Revenue"
          format="currency"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Orders over time</h2>
          <TimeSeriesChart
            data={dailySeries.map((point) => ({ date: point.date, value: point.orders }))}
            seriesLabel="Orders"
            format={{ unit: "order" }}
          />
        </div>
        <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">New customers</h2>
          <TimeSeriesChart
            data={newCustomers.map((point) => ({ date: point.date, value: point.count }))}
            seriesLabel="New customers"
            format={{ unit: "customer" }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Top-selling products</h2>
          <TopProductsList products={topProducts} />
        </div>
        <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Best-performing categories</h2>
          <RankedBarList
            items={categories.map((entry) => ({
              id: entry.category,
              label: entry.category,
              primaryValue: entry.revenue,
              secondaryText: `${entry.quantitySold} sold`,
            }))}
            format="currency"
            emptyMessage="No sales in this period yet."
          />
        </div>
      </div>

      {coupons.length > 0 ? (
        <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Coupon usage</h2>
          <RankedBarList
            items={coupons.map((entry) => ({
              id: entry.code,
              label: entry.code,
              primaryValue: entry.uses,
              secondaryText: `${formatCurrency(entry.totalDiscount)} discounted`,
            }))}
            format={{ unit: "use" }}
            emptyMessage="No coupons used in this period."
          />
        </div>
      ) : null}
    </div>
  );
}
