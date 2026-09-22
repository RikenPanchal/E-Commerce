"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderResponse, OrderStatus } from "@/types/order";

type ChangeableStatus = "pending" | "processing" | "shipped";

const NEXT_STATUS_OPTIONS: Record<ChangeableStatus, OrderStatus[]> = {
  pending: ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function isChangeable(status: OrderStatus): status is ChangeableStatus {
  return status === "pending" || status === "processing" || status === "shipped";
}

interface OrderStatusControlProps {
  orderId: string;
  currentStatus: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
}

export function OrderStatusControl({
  orderId,
  currentStatus,
  trackingNumber,
  carrier,
}: OrderStatusControlProps) {
  const router = useRouter();
  const options = isChangeable(currentStatus) ? NEXT_STATUS_OPTIONS[currentStatus] : [];

  const [status, setStatus] = useState<OrderStatus>(options[0] ?? currentStatus);
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [carrierName, setCarrierName] = useState(carrier ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return null;
  }

  async function handleSubmit() {
    if (status === "cancelled" && !window.confirm("Cancel this order and restore its stock?")) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          trackingNumber: status === "shipped" && tracking.trim() ? tracking : undefined,
          carrier: status === "shipped" && carrierName.trim() ? carrierName : undefined,
        }),
      });
      const data = (await response.json()) as OrderResponse;
      if (!data.success) {
        setError(data.message);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/5 p-5 dark:border-white/10">
      <h2 className="text-sm font-semibold text-foreground">Update status</h2>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          className="rounded-md border border-black/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-background text-foreground">
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
        >
          {isSubmitting ? "Updating..." : "Update"}
        </button>
      </div>

      {status === "shipped" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            placeholder="Tracking number (optional)"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
          <input
            value={carrierName}
            onChange={(event) => setCarrierName(event.target.value)}
            placeholder="Carrier (optional)"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
