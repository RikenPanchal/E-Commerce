"use client";

import { useEffect, useState } from "react";
import { useRecentlyViewed } from "@/components/recentlyViewed/RecentlyViewedProvider";
import { ProductCard } from "@/components/shop/ProductCard";
import { RecentlyViewedThumb } from "@/components/recentlyViewed/RecentlyViewedThumb";
import { useHorizontalScroll } from "@/components/home/useHorizontalScroll";
import { ScrollArrowButtons } from "@/components/home/ScrollArrowButtons";
import { CloseIcon, EyeIcon } from "@/components/home/icons";
import type { ProductsPageResponse, ProductWithRating } from "@/app/api/products/route";
import type { RatingSummary } from "@/types/review";

/**
 * Resolves the tracked ids into real, current product data through the
 * existing `/api/products/by-ids` endpoint (already used by the wishlist
 * page and Quick View) rather than trusting anything cached in
 * localStorage - a price or stock change since the visit shows up
 * correctly here. One batched request per mount/change, never one per
 * product. Renders nothing while empty or unresolved, so this never shows
 * up as an empty section, and any id that no longer resolves to a real
 * product (deleted, unpublished) is quietly dropped from history instead
 * of rendering a broken card.
 *
 * `variant="grid"` (default) is the original static-grid presentation,
 * unchanged, still used on the Product page and Shop page rails.
 * `variant="compact"` is the homepage's own lightweight version - smaller
 * thumbnails, a horizontal carousel, no "Clear all" - deliberately the
 * least visually heavy of the five homepage discovery sections.
 */
export function RecentlyViewedSection({
  excludeProductId,
  title = "Recently Viewed",
  description,
  variant = "grid",
}: {
  /** The product currently being viewed, if any - so its own page doesn't
   *  show itself in its own "recently viewed" rail. */
  excludeProductId?: string;
  title?: string;
  description?: string;
  variant?: "grid" | "compact";
}) {
  const { productIds, isHydrated, remove, clear } = useRecentlyViewed();
  const [resolved, setResolved] = useState<{ products: ProductWithRating[]; ratings: Map<string, RatingSummary> }>({
    products: [],
    ratings: new Map(),
  });
  const { scrollerRef, edges, canScroll, scrollByPage, handleScroll, handlePointerDown, handleClickCapture } =
    useHorizontalScroll();

  const idsKey = productIds.filter((id) => id !== excludeProductId).join(",");

  useEffect(() => {
    if (!idsKey) {
      // Resetting to empty the instant the tracked id list becomes empty
      // (Clear All, or the last entry removed), mirroring the fetch-reset
      // pattern below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolved({ products: [], ratings: new Map() });
      return;
    }

    let cancelled = false;
    fetch(`/api/products/by-ids?ids=${encodeURIComponent(idsKey)}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProductsPageResponse>) : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        const byId = new Map(data.products.map((product) => [product.id, product]));

        // Anything requested but not returned no longer exists (deleted or
        // unpublished) - self-heal by dropping it from history rather than
        // leaving a dead entry that will 404 next time.
        for (const id of idsKey.split(",")) {
          if (!byId.has(id)) remove(id);
        }

        // Preserve most-recent-first order - the API doesn't guarantee it
        // matches the id list's order.
        const ordered: ProductWithRating[] = [];
        const ratings = new Map<string, RatingSummary>();
        for (const id of idsKey.split(",")) {
          const product = byId.get(id);
          if (!product) continue;
          ordered.push(product);
          if (product.rating) ratings.set(product.id, product.rating);
        }
        setResolved({ products: ordered, ratings });
      })
      .catch(() => {
        // Keep whatever was last resolved rather than clearing a working
        // section over a transient network error.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (!isHydrated || resolved.products.length === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <section className="bg-cream/60 py-10 sm:py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-rose-400 uppercase">
                <EyeIcon className="h-3.5 w-3.5" />
                Recently viewed
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
              {description ? <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="min-w-0">
            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              onPointerDown={handlePointerDown}
              onClickCapture={handleClickCapture}
              className="flex snap-x snap-mandatory gap-3 relative overflow-x-auto pt-1 pb-1 select-none [-ms-overflow-style:none] [scrollbar-width:none] sm:cursor-grab sm:gap-4 [&::-webkit-scrollbar]:hidden"
            >
              {resolved.products.map((product) => (
                <div key={product.id} className="w-[34%] shrink-0 snap-start sm:w-[19%] md:w-[15%] lg:w-[12%]">
                  <RecentlyViewedThumb product={product} onRemove={remove} />
                </div>
              ))}
            </div>

            {canScroll ? (
              <div className="mt-4 flex justify-end">
                <ScrollArrowButtons edges={edges} onPrev={() => scrollByPage(-1)} onNext={() => scrollByPage(1)} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
          <button
            type="button"
            onClick={clear}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
          {resolved.products.map((product) => (
            <div key={product.id} className="relative">
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label={`Remove ${product.name} from recently viewed`}
                className="absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-surface text-foreground/60 shadow-sm transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
              <div className="rounded-md border border-surface-border bg-surface p-3">
                <ProductCard product={product} rating={resolved.ratings.get(product.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
