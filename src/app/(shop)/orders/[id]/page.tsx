import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getOrderForUser } from "@/lib/shop/orders";
import { formatCurrency } from "@/lib/utils/currency";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";

export const metadata: Metadata = {
  title: "Order details",
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
          Order confirmed
        </span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Order #{order.id.slice(-8)}</h1>
        <p className="text-sm text-foreground/60">
          Placed {dateFormatter.format(new Date(order.createdAt))}
        </p>
      </div>

      <div className="mt-8">
        <OrderStatusTimeline status={order.status} />
      </div>

      {order.trackingNumber || order.carrier ? (
        <div className="mt-8 rounded-2xl border border-black/5 p-5 shadow-sm dark:border-white/10 dark:shadow-none">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Shipment</h2>
          <p className="text-sm text-foreground/70">
            {order.carrier ? <>{order.carrier}&nbsp;&middot;&nbsp;</> : null}
            {order.trackingNumber ?? "No tracking number"}
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4">
        {order.items.map((item, index) => (
          <div
            key={`${item.productId}-${index}`}
            className="flex items-center gap-4 border-b border-black/5 pb-4 dark:border-white/10"
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
      </div>

      <div className="mt-6 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/60">Subtotal</span>
          <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
        </div>
        {order.discountAmount > 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">
              Discount {order.couponCode ? `(${order.couponCode})` : ""}
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              −{formatCurrency(order.discountAmount)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/60">Shipping</span>
          <span className="font-medium text-green-700 dark:text-green-400">Free</span>
        </div>
        <div className="flex items-center justify-between text-lg">
          <span className="text-foreground/60">Total</span>
          <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 rounded-2xl border border-black/5 p-5 shadow-sm dark:border-white/10 dark:shadow-none">
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
  );
}
