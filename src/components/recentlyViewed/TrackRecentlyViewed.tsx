"use client";

import { useEffect } from "react";
import { useRecentlyViewed } from "@/components/recentlyViewed/RecentlyViewedProvider";

/**
 * Renders nothing - just records a view once the product page (an async
 * Server Component, so it can't call `track` itself) has actually resolved
 * a real product. Effect is keyed only on `productId`, so it fires once per
 * distinct product visited, not on every re-render of the page around it,
 * and never for a route that 404s before this ever mounts.
 */
export function TrackRecentlyViewed({ productId }: { productId: string }) {
  const { track } = useRecentlyViewed();

  useEffect(() => {
    track(productId);
    // Intentionally re-running only when the viewed product changes, not
    // when `track`'s identity changes on every provider re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
