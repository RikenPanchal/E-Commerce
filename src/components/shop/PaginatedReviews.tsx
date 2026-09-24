"use client";

import { useEffect, useRef, useState } from "react";
import { ReviewList } from "@/components/shop/ReviewList";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/home/icons";
import { cn } from "@/components/ui/cn";
import type { ReviewPage, ReviewPageResponse, ReviewSort } from "@/types/review";

const SORT_LABELS: Record<ReviewSort, string> = {
  newest: "Newest",
  highest: "Highest rated",
  lowest: "Lowest rated",
};

/** Page numbers to render, with "gap" markers - always the first and last
 *  page, plus one neighbour either side of the current one
 *  (e.g. 1 … 4 5 6 … 12), so the bar never grows with the review count. */
function pageItems(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
  const pages = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push("gap");
    items.push(page);
  });
  return items;
}

const pagerButton =
  "flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

/**
 * The product page's review list with paging and sorting. The first page is
 * rendered on the server (`initialPage`) so it's in the HTML for search
 * engines and shows instantly; every later page or sort change is fetched
 * from GET /api/products/[slug]/reviews.
 */
export function PaginatedReviews({ slug, initialPage }: { slug: string; initialPage: ReviewPage }) {
  const [data, setData] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function load(page: number, sort: ReviewSort) {
    // Only the latest click counts - a slow earlier request must never
    // overwrite the page the visitor actually asked for last.
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ page: String(page), sort, pageSize: String(data.pageSize) });
      const response = await fetch(`/api/products/${encodeURIComponent(slug)}/reviews?${params}`, {
        signal: controller.signal,
      });
      const result = (await response.json()) as ReviewPageResponse;
      if (!result.success) {
        setError(result.message);
        return;
      }
      setData(result);
      // Bring the top of the list back into view when paging from the
      // bottom, but don't yank the page around if it's already visible.
      const top = topRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") setError("Couldn't load reviews. Please try again.");
    } finally {
      if (requestRef.current === controller) setIsLoading(false);
    }
  }

  if (data.total === 0) {
    return <ReviewList reviews={[]} />;
  }

  const first = (data.page - 1) * data.pageSize + 1;
  const last = first + data.reviews.length - 1;
  const hasPrevious = data.page > 1;
  const hasNext = data.page < data.pageCount;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Showing {first}–{last} of {data.total} review{data.total === 1 ? "" : "s"}
        </p>
        {data.total > 1 ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sort by
            <select
              value={data.sort}
              onChange={(event) => void load(1, event.target.value as ReviewSort)}
              disabled={isLoading}
              className="rounded-md border border-surface-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-rose-500 disabled:opacity-60"
            >
              {(Object.keys(SORT_LABELS) as ReviewSort[]).map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div aria-busy={isLoading} className={cn("transition-opacity", isLoading && "opacity-50")}>
        <ReviewList reviews={data.reviews} />
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      {data.pageCount > 1 ? (
        <nav aria-label="Review pages" className="mt-4 flex items-center justify-between gap-2 border-t border-surface-border pt-4 sm:justify-center">
          <button
            type="button"
            onClick={() => void load(data.page - 1, data.sort)}
            disabled={!hasPrevious || isLoading}
            aria-label="Previous page"
            className={cn(pagerButton, "border-surface-border text-foreground/80 hover:border-foreground/40")}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {/* Numbered pages only from sm up - the review column is too
              narrow on phones, where "Page X of Y" stands in instead. */}
          <span className="text-sm text-muted-foreground sm:hidden">
            Page {data.page} of {data.pageCount}
          </span>
          <div className="hidden items-center gap-1.5 sm:flex">
            {pageItems(data.page, data.pageCount).map((item, index) =>
              item === "gap" ? (
                <span key={`gap-${index}`} className="px-1 text-sm text-muted-foreground" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => void load(item, data.sort)}
                  disabled={isLoading || item === data.page}
                  aria-label={`Page ${item}`}
                  aria-current={item === data.page ? "page" : undefined}
                  className={cn(
                    pagerButton,
                    item === data.page
                      ? "border-rose-400 bg-rose-400 text-background disabled:opacity-100"
                      : "border-surface-border text-foreground/80 hover:border-foreground/40"
                  )}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => void load(data.page + 1, data.sort)}
            disabled={!hasNext || isLoading}
            aria-label="Next page"
            className={cn(pagerButton, "border-surface-border text-foreground/80 hover:border-foreground/40")}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
