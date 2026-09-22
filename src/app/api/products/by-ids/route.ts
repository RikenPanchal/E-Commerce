import { NextResponse } from "next/server";
import { getPublicProductsByIds } from "@/lib/shop/products";
import { getRatingSummaries } from "@/lib/shop/reviews";
import type { ProductWithRating, ProductsPageResponse } from "@/app/api/products/route";

/** Backs the wishlist page - given `?ids=a,b,c` (from localStorage, client
 *  side), returns those products' current live data. Not paginated: a
 *  wishlist is a bounded personal list, not a browsable catalog. */
export async function GET(request: Request): Promise<NextResponse<ProductsPageResponse>> {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ products: [], hasMore: false });
  }

  const products = await getPublicProductsByIds(ids);
  const ratings = await getRatingSummaries(products.map((product) => product.id));
  const withRatings: ProductWithRating[] = products.map((product) => ({
    ...product,
    rating: ratings.get(product.id),
  }));

  return NextResponse.json({ products: withRatings, hasMore: false });
}
