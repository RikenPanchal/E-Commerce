import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderForAdmin } from "@/lib/admin/orders";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/orders/PaymentStatusBadge";
import { OrderStatusControl } from "@/components/admin/orders/OrderStatusControl";
import { formatCurrency } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Order details",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForAdmin(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Order #{order.id.slice(-8)}</h1>
          <p className="text-sm text-foreground/60">
            Placed {dateFormatter.format(new Date(order.createdAt))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 p-5 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Customer</h2>
        <p className="text-sm text-foreground/70">
          {order.customerName}
          <br />
          {order.customerEmail}
        </p>
      </div>

      <div className="rounded-2xl border border-black/5 p-5 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Payment</h2>
        <div className="flex flex-col gap-1 text-sm text-foreground/70">
          <span>Provider: Razorpay</span>
          {order.razorpayOrderId ? <span>Razorpay order: {order.razorpayOrderId}</span> : null}
          {order.razorpayPaymentId ? <span>Razorpay payment: {order.razorpayPaymentId}</span> : null}
          {order.paidAt ? <span>Paid: {dateFormatter.format(new Date(order.paidAt))}</span> : null}
        </div>
      </div>

      {/* Keyed on status so the control resets its local form state cleanly
          after each transition, instead of carrying stale selections over. */}
      <OrderStatusControl
        key={order.status}
        orderId={order.id}
        currentStatus={order.status}
        paymentStatus={order.paymentStatus}
        trackingNumber={order.trackingNumber}
        carrier={order.carrier}
      />

      {order.trackingNumber || order.carrier ? (
        <div className="rounded-2xl border border-black/5 p-5 dark:border-white/10">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Shipment</h2>
          <p className="text-sm text-foreground/70">
            {order.carrier ? <>{order.carrier}&nbsp;&middot;&nbsp;</> : null}
            {order.trackingNumber ?? "No tracking number"}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
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

      {/* Same pricing breakdown the customer sees at checkout/order
          confirmation - shipping is free on every order (see
          src/lib/shop/shipping.ts), so there's nothing hidden here. */}
      <div className="flex flex-col gap-1.5 rounded-2xl border border-black/5 p-5 dark:border-white/10">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Pricing breakdown</h2>
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
          <span className="text-foreground">
            {order.shippingCost > 0 ? formatCurrency(order.shippingCost) : "Free"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-black/5 pt-2 text-base dark:border-white/10">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 p-5 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Shipping to</h2>
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
