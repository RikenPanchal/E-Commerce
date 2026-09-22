import { NextResponse } from "next/server";
import { getRecommendedProductsForMany } from "@/lib/shop/recommendations";
import { getRatingSummaries } from "@/lib/shop/reviews";
import type { ProductsPageResponse, ProductWithRating } from "@/app/api/products/route";

const MAX_LIMIT = 12;

/**
 * Backs the two client-side recommendation surfaces that can't be
 * server-rendered because their seed products live in localStorage, not a
 * request the server already sees: Cart ("Complete your look", seeded by
 * what's in the bag) and the homepage's "Picked for you" (seeded by
 * Recently Viewed). Both are guest-friendly - `seedIds` is just a list of
 * product ids the client already has (from its own cart/history state),
 * never a user id, so there is nothing here that could leak one person's
 * behavior to another the way an endpoint keyed on a client-supplied user
 * id could.
 */
export async function GET(request: Request): Promise<NextResponse<ProductsPageResponse>> {
  const url = new URL(request.url);
  const seedIds = (url.searchParams.get("seedIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const excludeIds = (url.searchParams.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const rawLimit = Number(url.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), MAX_LIMIT) : 8;

  if (seedIds.length === 0) {
    return NextResponse.json({ products: [], hasMore: false });
  }

  const products = await getRecommendedProductsForMany(seedIds, excludeIds, limit);
  const ratings = await getRatingSummaries(products.map((product) => product.id));
  const withRatings: ProductWithRating[] = products.map((product) => ({
    ...product,
    rating: ratings.get(product.id),
  }));

  return NextResponse.json({ products: withRatings, hasMore: false });
}
