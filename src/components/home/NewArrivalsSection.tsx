"use client";

import Link from "next/link";
import { NewArrivalCard } from "@/components/home/NewArrivalCard";
import { Reveal } from "@/components/home/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { SparkleIcon } from "@/components/home/icons";
import { CARD_VISIBILITY } from "@/components/home/singleRowCarousel";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";

/**
 * New Arrivals - the same editorial two-column composition Best Sellers
 * uses (so the page still feels cohesive), but visibly its own section:
 * a plain ivory background (not cream), taller `NewArrivalCard`s with a
 * strong "New" ribbon on every card, and its own heading/icon identity.
 */
export function NewArrivalsSection({
  products,
  ratings,
}: {
  products: ProductView[];
  ratings: Map<string, RatingSummary>;
}) {
  return (
    <section id="featured" className="scroll-mt-20 bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
          <Reveal className="flex flex-col justify-center lg:pb-10">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-rose-800 uppercase">
              <SparkleIcon className="h-4 w-4" />
              New arrivals
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.1] font-semibold text-foreground sm:text-5xl">
              Fresh Styles
              <br />
              Just In
            </h2>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Be the first to shop our latest collection of the season.
            </p>
            <Link
              href="/shop"
              className={buttonVariants({ variant: "outline-burgundy", size: "lg", className: "mt-6 w-fit" })}
            >
              Shop New Arrivals
            </Link>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
            {products.slice(0, CARD_VISIBILITY.length).map((product, index) => (
              <Reveal key={product.id} delayMs={Math.min(index, 5) * 60} className={CARD_VISIBILITY[index]}>
                <NewArrivalCard product={product} rating={ratings.get(product.id)} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
