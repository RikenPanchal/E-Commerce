"use client";

import { useState } from "react";
import Link from "next/link";
import type { BackInStockAlertView } from "@/lib/shop/backInStock";
import type { BackInStockUnsubscribeResponse } from "@/types/backInStock";

export function BackInStockAlerts({ alerts: initialAlerts }: { alerts: BackInStockAlertView[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const response = await fetch(`/api/account/back-in-stock/${id}`, { method: "DELETE" });
      const data = (await response.json()) as BackInStockUnsubscribeResponse;
      if (!data.success) {
        window.alert(data.message);
        return;
      }
      setAlerts((previous) => previous.filter((item) => item.id !== id));
    } catch {
      window.alert("Something went wrong. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  if (alerts.length === 0) {
    return <p className="text-sm text-foreground/60">You have no back-in-stock alerts set up.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => {
        const variantLabel = [alert.size, alert.color].filter(Boolean).join(" / ");
        return (
          <div
            key={alert.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 p-4 dark:border-white/10"
          >
            <div className="flex flex-col gap-0.5 text-sm">
              <Link href={`/products/${alert.productSlug}`} className="font-medium text-foreground hover:underline">
                {alert.productName}
              </Link>
              {variantLabel ? <span className="text-foreground/60">{variantLabel}</span> : null}
              <span className="text-xs text-foreground/50">
                {alert.status === "notified" ? "We emailed you - this item is back in stock" : "Waiting for restock"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(alert.id)}
              disabled={removingId === alert.id}
              className="shrink-0 text-xs font-medium text-foreground/50 hover:text-red-500 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        );
      })}
    </div>
  );
}
