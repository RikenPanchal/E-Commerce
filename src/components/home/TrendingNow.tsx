import { getCategoryHighlights } from "@/lib/shop/products";
import { TrendingNowSection } from "@/components/home/TrendingNowSection";

/**
 * "Trending now" - a real per-category snapshot (representative photo +
 * current starting price, see `getCategoryHighlights`), not another
 * product carousel. Stays a thin async Server Component; the interactive
 * carousel lives in `TrendingNowSection` (client).
 */
export async function TrendingNow() {
  const highlights = await getCategoryHighlights();

  if (highlights.length === 0) {
    return null;
  }

  return <TrendingNowSection highlights={highlights} />;
}
