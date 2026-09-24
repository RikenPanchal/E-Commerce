"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStockStatus, type StockStatus } from "@/lib/shop/stock";
import { formatCurrency } from "@/lib/utils/currency";
import { ProductThumbnail } from "@/components/admin/products/ProductThumbnail";
import { ProductActions } from "@/components/admin/products/ProductActions";
import type { PagedAdminProductsResult } from "@/lib/admin/products";
import type { ProductView } from "@/types/product";

const STOCK_BADGE_CLASSES: Record<StockStatus, string> = {
  in: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  low: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  out: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STOCK_BADGE_LABELS: Record<StockStatus, string> = {
  in: "In stock",
  low: "Low stock",
  out: "Out of stock",
};

function ProductRow({ product }: { product: ProductView }) {
  const status = getStockStatus(product.stock);
  return (
    <tr>
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <ProductThumbnail media={product.media} name={product.name} />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{product.name}</span>
            <span className="text-xs text-foreground/50">SKU {product.sku}</span>
          </div>
          {product.isFeatured ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
              Featured
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-3 text-foreground/70">{product.category}</td>
      <td className="px-6 py-3 text-foreground/70">{formatCurrency(product.price)}</td>
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-foreground/70">{product.stock}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STOCK_BADGE_CLASSES[status]}`}>
            {STOCK_BADGE_LABELS[status]}
          </span>
        </div>
      </td>
      <td className="px-6 py-3">
        <ProductActions product={product} />
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-md bg-black/5 dark:bg-white/10" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-32 animate-pulse rounded bg-black/5 dark:bg-white/10" />
            <div className="h-3 w-20 animate-pulse rounded bg-black/5 dark:bg-white/10" />
          </div>
        </div>
      </td>
      <td className="px-6 py-3">
        <div className="h-3.5 w-16 animate-pulse rounded bg-black/5 dark:bg-white/10" />
      </td>
      <td className="px-6 py-3">
        <div className="h-3.5 w-14 animate-pulse rounded bg-black/5 dark:bg-white/10" />
      </td>
      <td className="px-6 py-3">
        <div className="h-3.5 w-20 animate-pulse rounded bg-black/5 dark:bg-white/10" />
      </td>
      <td className="px-6 py-3" />
    </tr>
  );
}

/**
 * Renders the first (server-rendered) page of admin products immediately,
 * then fetches further pages from /api/admin/products as the admin scrolls
 * near the bottom of the table - instead of loading the entire matching
 * catalog into the page up front. `queryString` carries every active filter
 * (search/category/stock, never "page") so each fetched page matches the
 * same filters as the first one.
 */
export function InfiniteAdminProductsTable({
  initialProducts,
  initialHasMore,
  queryString,
  emptyMessage,
}: {
  initialProducts: ProductView[];
  initialHasMore: boolean;
  queryString: string;
  emptyMessage: React.ReactNode;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Page 0 is what `initialProducts` already is (server-rendered) - the
  // next fetch always asks for page 1, incrementing from there.
  const nextPageRef = useRef(1);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
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
      const params = queryString
        ? `${queryString}&page=${nextPageRef.current}`
        : `page=${nextPageRef.current}`;
      const response = await fetch(`/api/admin/products?${params}`);
      if (!response.ok) throw new Error("Request failed");
      const data: PagedAdminProductsResult = await response.json();
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
      // below the viewport, so the next rows are already there by the time
      // an admin actually scrolls to the bottom of the table.
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (products.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={5} className="px-6 py-8 text-center text-foreground/60">
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-black/5 dark:divide-white/10">
      {products.map((product) => (
        <ProductRow key={product.id} product={product} />
      ))}

      {hasMore ? (
        <>
          <tr ref={sentinelRef} aria-hidden={!loadFailed}>
            {loadFailed ? (
              <td colSpan={5} className="px-6 py-4">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="rounded-md border border-rose-800 px-4 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-blush"
                  >
                    Couldn&apos;t load more - tap to retry
                  </button>
                </div>
              </td>
            ) : (
              <td colSpan={5} className="h-px p-0" />
            )}
          </tr>
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : null}
        </>
      ) : (
        <tr>
          <td colSpan={5} className="px-6 py-4 text-center text-xs text-foreground/50">
            You&apos;ve seen every product in this view.
          </td>
        </tr>
      )}
    </tbody>
  );
}
