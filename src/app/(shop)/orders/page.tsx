import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getOrdersForUser } from "@/lib/shop/orders";
import { formatCurrency } from "@/lib/utils/currency";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

export const metadata: Metadata = {
  title: "My orders",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?from=/orders");
  }

  const orders = await getOrdersForUser(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">My orders</h1>

      {orders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-foreground/60">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/shop"
            className="rounded-full bg-rose-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-500"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-2xl border border-black/5 p-5 shadow-sm transition-all hover:border-black/20 hover:shadow-md dark:border-white/10 dark:shadow-none dark:hover:border-white/30"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">Order #{order.id.slice(-8)}</span>
                <span className="text-xs text-foreground/50">
                  {dateFormatter.format(new Date(order.createdAt))} &middot; {order.items.length} item
                  {order.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <OrderStatusBadge status={order.status} />
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
