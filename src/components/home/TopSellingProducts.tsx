import { getTopSellingPublicProducts } from "@/lib/shop/products";
import { getRatingSummaries } from "@/lib/shop/reviews";
import { BestSellersSection } from "@/components/home/BestSellersSection";
import { SINGLE_ROW_CARD_LIMIT } from "@/components/home/singleRowCarousel";

/**
 * "Best sellers" - real Top Selling products (ranked by actual units sold,
 * see `getTopSellingPublicProducts`), a single-row editorial layout rather
 * than a plain grid. Stays a thin async Server Component; the row itself
 * lives in `BestSellersSection` (client).
 */
export async function TopSellingProducts() {
  const products = await getTopSellingPublicProducts(SINGLE_ROW_CARD_LIMIT);

  if (products.length === 0) {
    return null;
  }

  const ratings = await getRatingSummaries(products.map((product) => product.id));

  return <BestSellersSection products={products} ratings={ratings} />;
}
