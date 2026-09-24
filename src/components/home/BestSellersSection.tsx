"use client";

import Link from "next/link";
import { BestSellerCard } from "@/components/home/BestSellerCard";
import { Reveal } from "@/components/home/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { CARD_VISIBILITY } from "@/components/home/singleRowCarousel";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";

/**
 * Best Sellers - an editorial two-column composition (intro text fixed on
 * the left, real Top Selling products in a single row on the right), the
 * first of five deliberately different homepage card/section designs.
 * Only the actual #1 product (`products[0]`, already ranked by real
 * units-sold in `getTopSellingPublicProducts`) gets the "Best Seller"
 * ribbon - never every card.
 */
export function BestSellersSection({
  products,
  ratings,
}: {
  products: ProductView[];
  ratings: Map<string, RatingSummary>;
}) {
  return (
    <section className="bg-cream py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
          <Reveal className="flex flex-col justify-center lg:pb-10">
            <p className="text-xs font-semibold tracking-[0.2em] text-rose-400 uppercase">Best sellers</p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.1] font-semibold text-foreground sm:text-5xl">
              Loved by Thousands
            </h2>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Our most popular styles, chosen by fashion lovers like you.
            </p>
            <Link href="/shop" className={buttonVariants({ variant: "burgundy", size: "lg", className: "mt-6 w-fit" })}>
              Shop Best Sellers
            </Link>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
            {products.slice(0, CARD_VISIBILITY.length).map((product, index) => (
              <Reveal key={product.id} delayMs={Math.min(index, 5) * 60} className={CARD_VISIBILITY[index]}>
                <BestSellerCard product={product} rating={ratings.get(product.id)} isTopSeller={index === 0} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
