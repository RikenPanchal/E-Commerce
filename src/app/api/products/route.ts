import { NextResponse } from "next/server";
import { getPagedPublicProducts } from "@/lib/shop/products";
import { parseShopFiltersFromSearchParams, SHOP_PAGE_SIZE } from "@/lib/shop/shopFilters";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";

export interface ProductWithRating extends ProductView {
  rating?: RatingSummary;
}

export interface ProductsPageResponse {
  products: ProductWithRating[];
  hasMore: boolean;
}

/** Backs the Shop page's infinite scroll - returns one page of products
 *  matching the same filters `/shop` itself understands. Page 0 is never
 *  requested from here (the Shop page server-renders that one directly via
 *  the same getPagedPublicProducts call), so this only ever serves page 1
 *  onward, but accepts page 0 too for consistency/testability. */
export async function GET(request: Request): Promise<NextResponse<ProductsPageResponse>> {
  const url = new URL(request.url);
  const filters = parseShopFiltersFromSearchParams(url.searchParams);

  const rawPage = Number(url.searchParams.get("page") ?? "0");
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;

  const { products, ratings, hasMore } = await getPagedPublicProducts(
    {
      category: filters.categories,
      search: filters.search,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sizes: filters.sizes,
      colors: filters.colors,
      brands: filters.brands,
      inStockOnly: filters.inStock,
      sort: filters.sort,
    },
    page,
    SHOP_PAGE_SIZE
  );

  const withRatings: ProductWithRating[] = products.map((product) => ({
    ...product,
    rating: ratings.get(product.id),
  }));

  return NextResponse.json({ products: withRatings, hasMore });
}
