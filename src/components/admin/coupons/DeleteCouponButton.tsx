"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CouponDeleteResponse } from "@/types/coupon";

export function DeleteCouponButton({ couponId, code }: { couponId: string; code: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Delete coupon "${code}"?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, { method: "DELETE" });
      const data = (await response.json()) as CouponDeleteResponse;
      if (!data.success) {
        window.alert(data.message);
        return;
      }
      router.refresh();
    } catch {
      window.alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      className="text-xs font-medium text-foreground/50 hover:text-red-500 disabled:opacity-50"
    >
      {isSubmitting ? "Deleting..." : "Delete"}
    </button>
  );
}
