"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openRazorpayCheckout } from "@/lib/payments/razorpayCheckout";
import type { OrderResponse } from "@/types/order";

/**
 * Lets a customer resume a checkout whose payment never went through - a
 * dropped connection, a declined card, or (most commonly) the tab being
 * closed before the original attempt's success/failure was ever reported
 * (see `failOrderPayment`'s own comment on why that case isn't
 * auto-resolved). Reuses the exact same Razorpay order created at checkout
 * (`razorpayOrderId`) - Razorpay accepts repeated payment attempts against
 * one order until one is captured, so this never creates a duplicate order
 * or double-reserves stock.
 */
export function RetryPaymentButton({
  orderId,
  razorpayOrderId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
}: {
  orderId: string;
  razorpayOrderId: string;
  /** Rupees, not paise - converted here so every caller of this component
   *  works in the same unit as the rest of the app (`Order.total`,
   *  `formatCurrency`). */
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      setError("Payments aren't configured yet. Please try again later.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await openRazorpayCheckout(
        {
          key: keyId,
          amount: Math.round(amount * 100),
          currency: "INR",
          order_id: razorpayOrderId,
          name: "E-Commerce",
          description: `Order #${orderId.slice(-8).toUpperCase()}`,
          prefill: { name: customerName, email: customerEmail, contact: customerPhone },
          theme: { color: "#e11d48" },
          handler: (response) => {
            void verify(response);
          },
          modal: {
            ondismiss: () => setIsSubmitting(false),
          },
        },
        (failure) => {
          setError(failure.error.description || "Payment failed. Please try again.");
          setIsSubmitting(false);
        }
      );
    } catch {
      setError("Couldn't open the payment window. Please try again.");
      setIsSubmitting(false);
    }
  }

  async function verify(response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
    try {
      const verifyResponse = await fetch(`/api/orders/${orderId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      });
      const data = (await verifyResponse.json()) as OrderResponse;
      if (!data.success) {
        setError(data.message);
        setIsSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("We couldn't confirm your payment just now. Refresh this page in a moment.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isSubmitting}
        className="w-fit rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {isSubmitting ? "Opening secure checkout..." : "Complete payment"}
      </button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
