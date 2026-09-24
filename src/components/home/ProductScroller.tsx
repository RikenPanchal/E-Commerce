"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/home/Reveal";
import { CloseIcon } from "@/components/home/icons";
import { cn } from "@/components/ui/cn";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";

const FADE = "2.5rem";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
      <path
        d={direction === "left" ? "M15 5.5 8.5 12l6.5 6.5" : "M9 5.5 15.5 12 9 18.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A drag/swipe-able horizontal strip of product cards with a quiet pair of
 * arrows and a "01 / 08" position indicator - the editorial-carousel
 * identity this homepage uses for "browse a real cluster of products
 * yourself" moments (currently Top Selling), as distinct from the curated
 * bento grid (Shop by category) or the plain grid (New Arrivals).
 * `cardClassName` controls how many cards are visible at a time - Top
 * Selling wants large, dominant cards; a future section could ask for a
 * tighter, smaller-card strip instead.
 *
 * The edges fade out via a mask, but only on whichever side still has more
 * to scroll to - a permanently-faded last card (from a static CSS mask)
 * looks like something's wrong with it even once you've reached the end,
 * so this tracks actual scroll position to turn each side's fade (and the
 * matching arrow's disabled state) on and off as you go.
 */
export function ProductScroller({
  products,
  ratings,
  badge,
  cardClassName = "w-[38%] sm:w-[23%] lg:w-[15%]",
  showCardFrame = true,
  onRemove,
}: {
  products: ProductView[];
  ratings: Map<string, RatingSummary>;
  badge?: string;
  cardClassName?: string;
  /** The subtle bordered-white-card treatment Top Selling uses, on by
   *  default. A different reuse (Trending Now, for instance) can pass
   *  `false` for `ProductCard`'s own plain, borderless look instead, so
   *  the two carousels don't read as the same section twice. */
  showCardFrame?: boolean;
  /** Optional per-card removal (Recently Viewed's "remove from history",
   *  say) - omitted by every other reuse of this carousel, so it changes
   *  nothing for them. Rendered as a small circle peeking out at the
   *  card's outer corner rather than overlaid on the image itself, since
   *  `ProductCard` already fills every corner of the image with its own
   *  wishlist/Quick View/Quick Add controls. */
  onRemove?: (productId: string, productName: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const [activeIndex, setActiveIndex] = useState(0);

  function cardStep(el: HTMLDivElement): number {
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0");
    return first.getBoundingClientRect().width + gap;
  }

  const updateState = useCallback(
    (el: HTMLDivElement) => {
      const atStart = el.scrollLeft <= 2;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
      setEdges((previous) =>
        previous.atStart === atStart && previous.atEnd === atEnd ? previous : { atStart, atEnd }
      );
      const step = cardStep(el);
      const index = step > 0 ? Math.round(el.scrollLeft / step) : 0;
      setActiveIndex(Math.min(Math.max(index, 0), Math.max(products.length - 1, 0)));
    },
    [products.length]
  );

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    updateState(event.currentTarget);
  }

  // A full screen's worth of cards per arrow click, not a single card - one
  // card at a time barely moved the row when several cards are visible at
  // once, reading as a tiny, ineffective "small scroll" that took many
  // clicks to get through the whole list (Trending Now fetches up to 24
  // products). `clientWidth` naturally preserves the same partial "next
  // card" peek at rest between clicks, since `cardClassName` is already
  // sized to not divide evenly into 100% wherever a peek is wanted.
  function scrollByCard(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateState(el);
    const handleResize = () => updateState(el);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateState]);

  const maskImage = `linear-gradient(to right, ${
    edges.atStart ? "black" : "transparent"
  }, black ${FADE}, black calc(100% - ${FADE}), ${edges.atEnd ? "black" : "transparent"})`;

  return (
    // `min-w-0` matters as soon as this sits in a CSS Grid/flex track (Top
    // Selling places it next to a fixed-width intro column) - grid/flex
    // items default to `min-width: auto`, which would otherwise let the
    // horizontally-scrolling row's full, unscrolled content width leak
    // into the track's own sizing and push the whole page wider than the
    // viewport instead of scrolling within itself.
    <div className="min-w-0">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={{ WebkitMaskImage: maskImage, maskImage }}
        className="flex snap-x snap-mandatory gap-4 relative overflow-x-auto pb-2 sm:gap-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, index) => (
          <Reveal
            key={product.id}
            delayMs={Math.min(index, 5) * 60}
            className={cn("relative shrink-0 snap-start", cardClassName)}
          >
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(product.id, product.name)}
                aria-label={`Remove ${product.name} from recently viewed`}
                className="absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-surface text-foreground/60 shadow-sm transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            ) : null}
            {showCardFrame ? (
              // A subtle white card on top of the section's own warm-ivory
              // background - just enough structure (small radius, thin
              // border) to lift the product off the section, never a heavy
              // boxed card. `ProductCard` itself stays fully borderless -
              // this wrapper is local to whichever carousel opts into it.
              <div className="rounded-md border border-surface-border bg-surface p-3">
                <ProductCard product={product} rating={ratings.get(product.id)} badge={badge} />
              </div>
            ) : (
              <ProductCard product={product} rating={ratings.get(product.id)} badge={badge} />
            )}
          </Reveal>
        ))}
      </div>

      {products.length > 1 ? (
        <div className="mt-6 flex items-center justify-between">
          <p className="font-mono text-xs tracking-wide text-muted-foreground tabular-nums">
            {String(activeIndex + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={edges.atStart}
              aria-label="Previous product"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-foreground transition-colors hover:border-foreground/40 disabled:opacity-30"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={edges.atEnd}
              aria-label="Next product"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-foreground transition-colors hover:border-foreground/40 disabled:opacity-30"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
