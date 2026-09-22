"use client";

import { useEffect, useState } from "react";
import type { ProductsPageResponse, ProductWithRating } from "@/app/api/products/route";
import type { RatingSummary } from "@/types/review";

export interface ResolvedRecommendations {
  products: ProductWithRating[];
  ratings: Map<string, RatingSummary>;
}

/**
 * The one client-side recommendation fetch/resolve lifecycle - shared by
 * `RecommendationsSection` (Cart's "Complete your look") and the
 * homepage's "Picked for you", which render completely different UI
 * around the same real data instead of each re-implementing this fetch.
 * Which server engine it resolves against is just `endpoint` (similarity
 * vs. complementary) - both return the same response shape. Renders
 * nothing (empty result) while there are no seeds or nothing came back,
 * so callers never need to fabricate a fallback list.
 */
export function useRecommendedProducts({
  seedProductIds,
  excludeProductIds = [],
  limit = 8,
  endpoint = "/api/products/recommendations",
}: {
  /** Product ids to base recommendations on. Passing an empty array
   *  intentionally resolves to nothing (never a fallback to "popular" or
   *  invented personalization). */
  seedProductIds: string[];
  excludeProductIds?: string[];
  limit?: number;
  endpoint?: string;
}): ResolvedRecommendations {
  const [resolved, setResolved] = useState<ResolvedRecommendations>({ products: [], ratings: new Map() });

  const seedKey = seedProductIds.join(",");
  const excludeKey = excludeProductIds.join(",");

  useEffect(() => {
    if (!seedKey) {
      // Resetting to empty the instant there are no seeds left (e.g. cart emptied).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolved({ products: [], ratings: new Map() });
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ seedIds: seedKey, limit: String(limit) });
    if (excludeKey) params.set("exclude", excludeKey);

    fetch(`${endpoint}?${params.toString()}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProductsPageResponse>) : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        const ratings = new Map<string, RatingSummary>();
        for (const product of data.products) {
          if (product.rating) ratings.set(product.id, product.rating);
        }
        setResolved({ products: data.products, ratings });
      })
      .catch(() => {
        // Keep whatever was last resolved rather than clearing a working
        // section over a transient network error.
      });

    return () => {
      cancelled = true;
    };
  }, [seedKey, excludeKey, limit, endpoint]);

  return resolved;
}
