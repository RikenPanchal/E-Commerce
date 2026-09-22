"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BackInStockUnsubscribeResponse } from "@/types/backInStock";

type Status = "pending" | "done" | "error";

/**
 * The landing page a back-in-stock email's unsubscribe link points to - acts
 * on the token in the URL automatically (no extra click needed, matching
 * what a "one click unsubscribe" link implies) rather than requiring a form
 * submission first.
 */
export function UnsubscribeBackInStockPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState("Unsubscribing...");

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      setMessage("This unsubscribe link is missing its token.");
      return;
    }

    let cancelled = false;
    fetch("/api/back-in-stock/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => response.json() as Promise<BackInStockUnsubscribeResponse>)
      .then((data) => {
        if (cancelled) return;
        setStatus(data.success ? "done" : "error");
        setMessage(data.message);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return <p className={`text-sm ${status === "error" ? "text-red-500" : "text-foreground/70"}`}>{message}</p>;
}
