"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { QuickViewGallery } from "@/components/shop/QuickViewGallery";
import { AddToCartForm } from "@/components/shop/AddToCartForm";
import { StarRating } from "@/components/shop/StarRating";
import { useAccessibleDialog } from "@/components/ui/useAccessibleDialog";
import { useRecentlyViewed } from "@/components/recentlyViewed/RecentlyViewedProvider";
import { CloseIcon, ArrowRightIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";
import type { ProductsPageResponse } from "@/app/api/products/route";

/**
 * Quick View: opened directly from a `ProductCard` on any listing page, using
 * the same `product`/`rating` the card already has - no fetch needed to open
 * instantly. All variant/quantity/cart/wishlist behavior is delegated to the
 * real `AddToCartForm` (same component the full product page renders) so
 * this can never show stock/price/variant state that disagrees with the
 * product page - there's only one implementation of that logic to disagree
 * with itself. A background refresh via the existing by-ids endpoint then
 * silently corrects the snapshot if it's gone stale, or reveals that the
 * product was removed since the listing loaded.
 */
export function QuickViewModal({
  product,
  rating,
  open,
  onClose,
}: {
  product: ProductView;
  rating?: RatingSummary;
  open: boolean;
  onClose: () => void;
}) {
  const [liveProduct, setLiveProduct] = useState(product);
  const [liveRating, setLiveRating] = useState(rating);
  const [status, setStatus] = useState<"ok" | "deleted">("ok");
  const { mounted, dialogRef } = useAccessibleDialog<HTMLDivElement>(open, onClose);
  const { track } = useRecentlyViewed();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- resetting to the
       listing snapshot (already-known data) the instant Quick View opens
       for a (possibly different) product, then kicking off the background
       revalidation fetch below. */
    setLiveProduct(product);
    setLiveRating(rating);
    setStatus("ok");
    /* eslint-enable react-hooks/set-state-in-effect */

    // Quick View shows real images/price/description and lets the customer
    // act on the product - a genuine view, not just a card glance - so it
    // counts the same way opening the full product page does. `track`
    // already dedupes by product id, so if the customer goes on to "View
    // full details" and the page also tracks it, that's just a harmless
    // timestamp refresh, not a duplicate entry.
    track(product.id);

    let cancelled = false;
    fetch(`/api/products/by-ids?ids=${encodeURIComponent(product.id)}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProductsPageResponse>) : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        const fresh = data.products[0];
        if (!fresh) {
          setStatus("deleted");
          return;
        }
        const { rating: freshRating, ...freshProduct } = fresh;
        setLiveProduct(freshProduct);
        setLiveRating(freshRating);
      })
      .catch(() => {
        // Keep showing the listing snapshot - a failed background refresh
        // isn't worth surfacing as an error when good data is already on screen.
      });

    return () => {
      cancelled = true;
    };
    // Re-run only when a (possibly different) product opens, not on every
    // parent re-render that hands down a fresh `product`/`rating` object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product.id]);

  if (!mounted || !open) return null;

  const discountPercent =
    liveProduct.compareAtPrice && liveProduct.compareAtPrice > liveProduct.price
      ? Math.round(((liveProduct.compareAtPrice - liveProduct.price) / liveProduct.compareAtPrice) * 100)
      : 0;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view - ${liveProduct.name}`}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-y-auto rounded-t-lg border-t border-surface-border bg-surface shadow-xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:w-[min(90vw,860px)] sm:flex-row sm:overflow-hidden sm:rounded-lg sm:border"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground hover:text-background sm:top-4 sm:right-4"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        {status === "deleted" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="font-serif text-lg font-semibold text-foreground">This item is no longer available</p>
            <p className="text-sm text-muted-foreground">It may have sold out or been removed from the catalog.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-full bg-foreground px-5 py-2 text-xs font-medium tracking-[0.1em] text-background uppercase transition-opacity hover:opacity-90"
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 sm:w-[48%] sm:shrink-0 sm:p-5">
              <QuickViewGallery
                media={liveProduct.media}
                name={liveProduct.name}
                category={liveProduct.category}
                badge={discountPercent > 0 ? `-${discountPercent}%` : undefined}
              />
            </div>

            <div className="flex flex-1 flex-col gap-4 border-t border-surface-border p-4 sm:overflow-y-auto sm:border-t-0 sm:border-l sm:p-6">
              <div className="flex flex-col gap-1 pr-8">
                <span className="text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  {liveProduct.category}
                </span>
                <h2 className="font-serif text-xl font-semibold text-foreground">{liveProduct.name}</h2>
                <StarRating rating={liveRating?.average ?? 0} count={liveRating?.count ?? 0} />
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-lg font-semibold text-foreground">{formatCurrency(liveProduct.price)}</span>
                {discountPercent > 0 && liveProduct.compareAtPrice ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(liveProduct.compareAtPrice)}
                    </span>
                    <span className="text-sm font-medium text-rose-600">Save {discountPercent}%</span>
                  </>
                ) : null}
              </div>

              <AddToCartForm product={liveProduct} />

              <Link
                href={`/products/${liveProduct.slug}`}
                onClick={onClose}
                className="group mt-auto inline-flex items-center gap-2 border-t border-surface-border pt-4 text-xs font-medium tracking-[0.1em] text-foreground uppercase"
              >
                View full details
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
