"use client";

import Link from "next/link";
import { useRecentlyViewed } from "@/components/recentlyViewed/RecentlyViewedProvider";
import { useRecommendedProducts } from "@/components/shop/useRecommendedProducts";
import { ProductImage } from "@/components/shop/ProductImage";
import { Reveal } from "@/components/home/Reveal";
import { HeartIcon, ArrowRightIcon } from "@/components/home/icons";
import { CARD_VISIBILITY, SINGLE_ROW_CARD_LIMIT } from "@/components/home/singleRowCarousel";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductWithRating } from "@/app/api/products/route";

function PickedForYouCard({ product }: { product: ProductWithRating }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block bg-surface p-2.5 shadow-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream">
        <ProductImage
          media={product.media}
          name={product.name}
          category={product.category}
          className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
      </div>
      <div className="flex flex-col gap-0.5 pt-2">
        <span className="block truncate text-xs font-medium text-foreground">{product.name}</span>
        <span className="text-xs font-semibold text-rose-800">{formatCurrency(product.price)}</span>
      </div>
    </Link>
  );
}

/**
 * "Picked for you" - the most editorial of the five homepage sections: a
 * full-width deep-burgundy panel, seeded by real Recently Viewed history
 * through the same `useRecommendedProducts` hook Cart's "Complete your
 * look" uses (never a duplicate recommendation system), with the actual
 * top recommendation's own real photo standing in as the section's large
 * editorial image - never a stock/invented photo. Renders nothing without
 * real history or real recommendations to show.
 */
export function PickedForYouSection() {
  const { productIds, isHydrated } = useRecentlyViewed();
  const resolved = useRecommendedProducts({ seedProductIds: productIds, limit: SINGLE_ROW_CARD_LIMIT });

  if (!isHydrated || resolved.products.length === 0) {
    return null;
  }

  const [heroProduct, ...rest] = resolved.products;

  return (
    <section className="bg-rose-800 py-14 text-white sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_240px_1fr] lg:items-center lg:gap-10">
          <Reveal className="flex flex-col justify-center">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-rose-200 uppercase">
              <HeartIcon className="h-4 w-4" />
              Picked for you
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.1] font-semibold text-white sm:text-5xl">
              Styles We Think You&apos;ll Love
            </h2>
            <p className="mt-4 max-w-xs text-sm text-white/70">
              Handpicked based on your style &amp; preferences.
            </p>
            <Link
              href="/shop"
              className="group mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-white/40 px-6 py-3 text-xs font-medium tracking-[0.1em] text-white uppercase transition-colors hover:bg-white/10"
            >
              Discover More
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <Reveal delayMs={80} className="hidden aspect-[3/4] overflow-hidden rounded-sm lg:block">
            <ProductImage
              media={heroProduct.media}
              name={heroProduct.name}
              category={heroProduct.category}
              className="h-full w-full"
            />
          </Reveal>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {[heroProduct, ...rest].slice(0, SINGLE_ROW_CARD_LIMIT).map((product, index) => (
              <Reveal key={product.id} delayMs={Math.min(index, 5) * 60} className={CARD_VISIBILITY[index]}>
                <PickedForYouCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
