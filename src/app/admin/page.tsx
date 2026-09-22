import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardStats } from "@/lib/admin/stats";
import { getAllUsers } from "@/lib/admin/users";
import { getAllOrdersForAdmin, getOrderStats } from "@/lib/admin/orders";
import { getOrderStatusBreakdown, getRevenueOverTime, getTopProducts } from "@/lib/admin/analytics";
import { StatCard } from "@/components/admin/StatCard";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { RevenueChart } from "@/components/admin/analytics/RevenueChart";
import { TopProductsList } from "@/components/admin/analytics/TopProductsList";
import { StatusBreakdown } from "@/components/admin/analytics/StatusBreakdown";
import { formatCurrency } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminOverviewPage() {
  const [stats, recentUsers, orderStats, recentOrders, revenueOverTime, topProducts, statusBreakdown] =
    await Promise.all([
      getDashboardStats(),
      getAllUsers(5),
      getOrderStats(),
      getAllOrdersForAdmin(5),
      getRevenueOverTime(30),
      getTopProducts(5),
      getOrderStatusBreakdown(),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-foreground/60">A snapshot of your store&apos;s accounts</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total accounts" value={stats.totalUsers} />
        <StatCard label="Customers" value={stats.totalCustomers} />
        <StatCard label="Admins" value={stats.totalAdmins} />
        <StatCard label="New this week" value={stats.newThisWeek} />
        <StatCard label="Orders" value={orderStats.totalOrders} />
        <StatCard label="Revenue" value={formatCurrency(orderStats.totalRevenue)} />
      </div>

      <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Revenue</h2>
        <RevenueChart data={revenueOverTime} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Top products</h2>
          <TopProductsList products={topProducts} />
        </div>
        <div className="rounded-2xl border border-black/5 p-6 dark:border-white/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Orders by status</h2>
          <StatusBreakdown breakdown={statusBreakdown} />
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/10">
          <h2 className="text-sm font-semibold text-foreground">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {recentOrders.length === 0 ? (
            <li className="px-6 py-4 text-sm text-foreground/60">No orders yet</li>
          ) : (
            recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.03]"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      #{order.id.slice(-8)} &middot; {order.customerName}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-black/5 dark:border-white/10">
        <div className="border-b border-black/5 px-6 py-4 dark:border-white/10">
          <h2 className="text-sm font-semibold text-foreground">Recent sign-ups</h2>
        </div>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {recentUsers.length === 0 ? (
            <li className="px-6 py-4 text-sm text-foreground/60">No accounts yet</li>
          ) : (
            recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
                  <span className="truncate text-sm text-foreground/60">{user.email}</span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <RoleBadge role={user.role} />
                  <span className="text-xs text-foreground/50">
                    {dateFormatter.format(new Date(user.createdAt))}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
