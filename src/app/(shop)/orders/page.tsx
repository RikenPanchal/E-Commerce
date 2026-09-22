import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getOrdersForUser } from "@/lib/shop/orders";
import { formatCurrency } from "@/lib/utils/currency";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { PageHero } from "@/components/shop/PageHero";
import { buttonVariants } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?from=/orders");
  }

  const orders = await getOrdersForUser(user.id);

  return (
    <div className="flex flex-col">
      <PageHero
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "My orders" }]}
        eyebrow="Order history"
        title="My orders"
        description="Track and review everything you've bought."
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-foreground/60">You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className={buttonVariants({ variant: "burgundy" })}>
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-2xl border border-surface-border bg-background p-5 shadow-sm transition-all hover:border-rose-300 hover:shadow-md"
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
    </div>
  );
}
