import { NextResponse } from "next/server";
import { getCompleteTheLookProductsForMany } from "@/lib/shop/recommendations";
import { getRatingSummaries } from "@/lib/shop/reviews";
import type { ProductsPageResponse, ProductWithRating } from "@/app/api/products/route";

const MAX_LIMIT = 8;

/**
 * The client-side counterpart to the Product Page's server-rendered
 * "Complete the Look" - backs Cart's "Complete your look", whose seed
 * products (the cart's contents) only exist in client state. Deliberately a
 * separate endpoint from `/api/products/recommendations`: that one answers
 * "what's similar", this one answers "what complements" - conflating them
 * behind a mode flag would make it easy for a future change to one to
 * silently affect the other. Guest-friendly and stateless - `seedIds` are
 * product ids the client already has, never a user id.
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
  const rawLimit = Number(url.searchParams.get("limit") ?? "6");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), MAX_LIMIT) : 6;

  if (seedIds.length === 0) {
    return NextResponse.json({ products: [], hasMore: false });
  }

  const products = await getCompleteTheLookProductsForMany(seedIds, excludeIds, limit);
  const ratings = await getRatingSummaries(products.map((product) => product.id));
  const withRatings: ProductWithRating[] = products.map((product) => ({
    ...product,
    rating: ratings.get(product.id),
  }));

  return NextResponse.json({ products: withRatings, hasMore: false });
}
