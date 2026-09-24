"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import type { ProductWithRating, ProductsPageResponse } from "@/app/api/products/route";

// Shared by the real grid and the skeleton row below it, so a page of
// loading placeholders lines up in exactly the same columns as the real
// cards that replace them - 2 columns on phones, 3 from tablet width, 4
// from desktop width, matching the design brief.
const GRID_CLASSES = "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6";

/**
 * Renders the first (server-rendered) page immediately, then fetches
 * further pages from /api/products as the visitor scrolls near the bottom -
 * instead of loading the entire matching catalog up front. `queryString`
 * carries every active filter (everything /shop's own URL has, minus
 * "page") so each fetched page is filtered identically to the first one.
 */
export function InfiniteProductGrid({
  initialProducts,
  initialHasMore,
  queryString,
}: {
  initialProducts: ProductWithRating[];
  initialHasMore: boolean;
  queryString: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Page 0 is what `initialProducts` already is (server-rendered) - the
  // next fetch always asks for page 1, incrementing from there.
  const nextPageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // A ref (not just the `isLoading` state) guards against a second
  // IntersectionObserver callback firing before the first fetch's state
  // update has committed, which could otherwise trigger the same page
  // fetch twice.
  const isFetchingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const params = queryString ? `${queryString}&page=${nextPageRef.current}` : `page=${nextPageRef.current}`;
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error("Request failed");
      const data: ProductsPageResponse = await response.json();
      setProducts((previous) => {
        // Defensive de-dupe: normally impossible now that pagination's sort
        // always has a unique tiebreaker, but a product edited/reordered
        // between two page fetches (a race, not a bug in the sort itself)
        // could still in principle land on both pages - silently dropping
        // a duplicate is safer than a duplicate React key.
        const seen = new Set(previous.map((product) => product.id));
        return [...previous, ...data.products.filter((product) => !seen.has(product.id))];
      });
      setHasMore(data.hasMore);
      nextPageRef.current += 1;
    } catch {
      setLoadFailed(true);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, queryString]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      // Starts fetching while the sentinel is still a few hundred pixels
      // below the viewport, so the next row of products is already there
      // by the time a visitor actually scrolls to the bottom.
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className={GRID_CLASSES}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} rating={product.rating} />
        ))}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="mt-10">
          {isLoading ? (
            // A row of skeleton cards in the same grid, rather than a bare
            // spinner - it previews the shape of what's about to arrive
            // instead of just signalling "something is happening".
            <div aria-label="Loading more products" className={GRID_CLASSES}>
              {Array.from({ length: 4 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : loadFailed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="rounded-md border border-rose-800 px-5 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-blush"
              >
                Couldn&apos;t load more - tap to retry
              </button>
            </div>
          ) : null}
        </div>
      ) : products.length > 0 ? (
        <p className="mt-10 text-center text-xs text-muted-foreground">You&apos;ve seen every product in this view.</p>
      ) : null}
    </>
  );
}
