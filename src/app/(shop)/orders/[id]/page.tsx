import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getOrderForUser } from "@/lib/shop/orders";
import { formatCurrency } from "@/lib/utils/currency";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { PageHero } from "@/components/shop/PageHero";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/signin?from=/orders/${id}`);
  }

  const order = await getOrderForUser(user.id, id);
  if (!order) {
    notFound();
  }

  const orderNumber = order.id.slice(-8).toUpperCase();

  return (
    <div className="flex flex-col">
      <PageHero
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "My orders", href: "/orders" },
          { label: `#${orderNumber}` },
        ]}
        eyebrow="Order confirmed"
        title={`Order #${orderNumber}`}
        description={`Placed ${dateFormatter.format(new Date(order.createdAt))}`}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-surface-border bg-background p-5 shadow-sm">
          <OrderStatusTimeline status={order.status} />
        </div>

        {order.trackingNumber || order.carrier ? (
          <div className="mt-6 rounded-2xl border border-surface-border bg-background p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Shipment</h2>
            <p className="text-sm text-foreground/70">
              {order.carrier ? <>{order.carrier}&nbsp;&middot;&nbsp;</> : null}
              {order.trackingNumber ?? "No tracking number"}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-surface-border bg-background p-5 shadow-sm">
          {order.items.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className="flex items-center gap-4 border-b border-black/5 pb-4 last:border-b-0 last:pb-0 dark:border-white/10"
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-black/5 text-xs text-foreground/40 dark:bg-white/10">
                  No photo
                </div>
              )}
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-foreground/50">
                  {[item.size, item.color].filter(Boolean).join(" / ")} &middot; Qty {item.quantity}
                </span>
              </div>
              <span className="text-sm text-foreground">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Subtotal</span>
              <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">
                  Discount {order.couponCode ? `(${order.couponCode})` : ""}
                </span>
                <span className="text-rose-800">
                  −{formatCurrency(order.discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Shipping</span>
              <span className="font-medium text-green-700 dark:text-green-400">
                {order.shippingCost > 0 ? formatCurrency(order.shippingCost) : "Free"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-black/5 pt-2 text-lg dark:border-white/10">
              <span className="text-foreground/60">Total</span>
              <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-surface-border bg-background p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Shipping to</h2>
          <p className="text-sm text-foreground/70">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? <>, {order.shippingAddress.line2}</> : null}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
