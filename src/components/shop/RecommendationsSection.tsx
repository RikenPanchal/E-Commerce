"use client";

import { ProductScroller } from "@/components/home/ProductScroller";
import { useRecommendedProducts } from "@/components/shop/useRecommendedProducts";

/**
 * The client-side counterpart to the server-rendered recommendation
 * sections (Product Page, Shop/Category) - for surfaces whose seed products
 * only exist in client state (Cart's contents). Fetch/resolve lifecycle
 * lives in `useRecommendedProducts`, shared with the homepage's "Picked for
 * you" (a completely different, bespoke layout around the same real data).
 */
export function RecommendationsSection({
  seedProductIds,
  excludeProductIds = [],
  title,
  limit = 8,
  endpoint = "/api/products/recommendations",
}: {
  /** Product ids to base recommendations on - cart contents, or Recently
   *  Viewed history. Passing an empty array intentionally renders nothing
   *  (never a fallback to "popular" or invented personalization). */
  seedProductIds: string[];
  excludeProductIds?: string[];
  title: string;
  limit?: number;
  /** Which server endpoint to resolve seeds through - defaults to the
   *  general similarity engine; Cart's "Complete your look" passes
   *  `/api/products/complete-the-look` instead for complementary (not
   *  merely similar) picks. Both return the same response shape. */
  endpoint?: string;
}) {
  const resolved = useRecommendedProducts({ seedProductIds, excludeProductIds, limit, endpoint });

  if (resolved.products.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
        <h2 className="mb-6 font-serif text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
        <ProductScroller
          products={resolved.products}
          ratings={resolved.ratings}
          cardClassName="w-[58%] sm:w-[42%] md:w-[32%] lg:w-[23%]"
          showCardFrame={false}
        />
      </div>
    </section>
  );
}
