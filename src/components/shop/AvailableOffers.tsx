"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { formatCurrency } from "@/lib/utils/currency";
import type { OffersResponse, PublicOfferView } from "@/types/coupon";

const expiryFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

function discountLabel(offer: PublicOfferView): string {
  return offer.discountType === "percentage" ? `${offer.value}% off` : `${formatCurrency(offer.value)} off`;
}

/**
 * Real, currently-usable coupons only - see `getPublicOffers`. Renders
 * nothing at all (not even a heading) when there's nothing to show, per the
 * spec: no placeholder/fake offers, ever.
 */
export function AvailableOffers() {
  const { appliedCoupon, applyCoupon } = useCart();
  const { showToast } = useToast();
  const [offers, setOffers] = useState<PublicOfferView[] | null>(null);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coupons/offers")
      .then((response) => response.json() as Promise<OffersResponse>)
      .then((data) => {
        if (cancelled) return;
        setOffers(data.success ? data.offers : []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!offers || offers.length === 0) return null;

  async function handleApply(code: string) {
    setApplyingCode(code);
    const ok = await applyCoupon(code);
    setApplyingCode(null);
    showToast({ message: ok ? `"${code}" applied` : `Couldn't apply "${code}"` });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-xs font-semibold tracking-wide text-foreground/50 uppercase">Available offers</h2>
      <div className="flex flex-col gap-2">
        {offers.map((offer) => {
          const isApplied = appliedCoupon?.code === offer.code;
          return (
            <div
              key={offer.code}
              className="flex items-center justify-between gap-3 rounded-md border border-blush-line bg-blush/60 px-3.5 py-2.5"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-rose-800 uppercase">{offer.code}</span>
                <span className="text-xs text-foreground/60">
                  {discountLabel(offer)}
                  {offer.minOrderAmount ? ` on orders above ${formatCurrency(offer.minOrderAmount)}` : ""}
                  {offer.applicableCategories && offer.applicableCategories.length > 0
                    ? ` · Valid on ${offer.applicableCategories.join(", ")}`
                    : ""}
                  {offer.expiresAt ? ` · Expires ${expiryFormatter.format(new Date(offer.expiresAt))}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleApply(offer.code)}
                disabled={isApplied || applyingCode === offer.code}
                className="shrink-0 text-xs font-medium text-rose-800 underline underline-offset-4 hover:text-burgundy disabled:opacity-50 disabled:no-underline"
              >
                {isApplied ? "Applied" : applyingCode === offer.code ? "Applying..." : "Apply"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
