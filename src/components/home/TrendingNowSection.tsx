"use client";

import Link from "next/link";
import { useHorizontalScroll } from "@/components/home/useHorizontalScroll";
import { ScrollArrowButtons } from "@/components/home/ScrollArrowButtons";
import { TrendingCategoryCard } from "@/components/home/TrendingCategoryCard";
import { Reveal } from "@/components/home/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { FlameIcon } from "@/components/home/icons";
import type { CategoryHighlight } from "@/lib/shop/products";

const CARD_WIDTH = "w-[52%] sm:w-[34%] md:w-[26%] lg:w-[22%]";

/**
 * Trending Now - deliberately NOT another product carousel: a real
 * category-discovery carousel (arched photo, a numbered index, the
 * category name, its real current starting price), on the "Blush"
 * background - visually the most different of the five homepage sections,
 * per the brief's own instruction not to repeat the same card everywhere.
 */
export function TrendingNowSection({ highlights }: { highlights: CategoryHighlight[] }) {
  const { scrollerRef, edges, canScroll, scrollByPage, handleScroll, handlePointerDown, handleClickCapture } =
    useHorizontalScroll();

  return (
    <section id="trending" className="scroll-mt-20 bg-rose-100 py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
          <Reveal className="flex flex-col justify-center lg:pb-10">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-rose-800 uppercase">
              <FlameIcon className="h-4 w-4" />
              Trending now
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.1] font-semibold text-foreground sm:text-5xl">
              What&apos;s Hot Right Now
            </h2>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Fresh styles. Big vibes. Shop what&apos;s trending this week.
            </p>
            <Link href="/shop" className={buttonVariants({ variant: "burgundy", size: "lg", className: "mt-6 w-fit" })}>
              Explore Trending
            </Link>
          </Reveal>

          <div className="min-w-0">
            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              onPointerDown={handlePointerDown}
              onClickCapture={handleClickCapture}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 pt-2 select-none [-ms-overflow-style:none] [scrollbar-width:none] sm:cursor-grab sm:gap-8 [&::-webkit-scrollbar]:hidden"
            >
              {highlights.map((highlight, index) => (
                <Reveal
                  key={highlight.category}
                  delayMs={Math.min(index, 5) * 60}
                  className={`shrink-0 snap-start ${CARD_WIDTH}`}
                >
                  <TrendingCategoryCard
                    category={highlight.category}
                    product={highlight.product}
                    index={index}
                  />
                </Reveal>
              ))}
            </div>

            {canScroll ? (
              <div className="mt-6 flex justify-end">
                <ScrollArrowButtons edges={edges} onPrev={() => scrollByPage(-1)} onNext={() => scrollByPage(1)} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
