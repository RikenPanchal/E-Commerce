"use client";

import { useState, type FormEvent } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/currency";

/**
 * The one coupon input/applied-state UI, shared by the Cart page and
 * Checkout - both read the same `useCart()` coupon state, so applying (or
 * removing) it on either page is instantly reflected on the other, and
 * survives navigating between them.
 */
export function CouponBox() {
  const { appliedCoupon, couponError, isApplyingCoupon, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || isApplyingCoupon) return;
    const applied = await applyCoupon(code);
    if (applied) setCode("");
  }

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-blush-line bg-blush px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold tracking-wide text-rose-800 uppercase">{appliedCoupon.code}</span>
          <span className="text-xs text-foreground/60">
            You saved {formatCurrency(appliedCoupon.discountAmount)}
          </span>
        </div>
        <button
          type="button"
          onClick={removeCoupon}
          aria-label={`Remove coupon ${appliedCoupon.code}`}
          className="shrink-0 text-xs font-medium text-foreground/50 underline underline-offset-4 hover:text-red-500"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Coupon code"
          aria-label="Coupon code"
          disabled={isApplyingCoupon}
          className="min-w-0 flex-1 rounded-md border border-blush-line bg-background px-3.5 py-2 text-sm uppercase tracking-wide text-foreground outline-none focus:border-rose-800 disabled:opacity-60"
        />
        <Button type="submit" variant="burgundy" size="sm" disabled={isApplyingCoupon || !code.trim()}>
          {isApplyingCoupon ? "Applying..." : "Apply"}
        </Button>
      </div>
      {couponError ? <p className="text-xs text-red-500">{couponError}</p> : null}
    </form>
  );
}
