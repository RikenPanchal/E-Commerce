import { getFeaturedPublicProducts } from "@/lib/shop/products";
import { getRatingSummaries } from "@/lib/shop/reviews";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { SINGLE_ROW_CARD_LIMIT } from "@/components/home/singleRowCarousel";

/**
 * "New arrivals" - real featured/newest products, a single-row editorial
 * layout (visibly distinct from Best Sellers) rather than a plain grid.
 * Stays a thin async Server Component; the row itself lives in
 * `NewArrivalsSection` (client).
 */
export async function FeaturedProducts() {
  const products = await getFeaturedPublicProducts(SINGLE_ROW_CARD_LIMIT);

  if (products.length === 0) {
    return null;
  }

  const ratings = await getRatingSummaries(products.map((product) => product.id));

  return <NewArrivalsSection products={products} ratings={ratings} />;
}
