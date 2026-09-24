"use client";

import { useEffect, useState } from "react";
import { ProductImage } from "@/components/shop/ProductImage";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { HeartIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductView } from "@/types/product";

/** A floating bar that appears once the main buy box scrolls out of view -
 *  a common modern-PDP pattern that keeps price and "add to bag" reachable
 *  while a visitor is reading the description or scrolling through
 *  reviews, instead of making them scroll all the way back up. It links
 *  back to the real buy box (with its size/color picker) rather than
 *  duplicating that logic here, so it can never add the wrong variant. */
export function StickyBuyBar({ product, isOutOfStock }: { product: ProductView; isOutOfStock: boolean }) {
  const [visible, setVisible] = useState(false);
  const { has, toggle } = useWishlist();
  const isWishlisted = has(product.id);

  useEffect(() => {
    const sentinel = document.getElementById("buy-box");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only react once the buy box has scrolled fully above the
        // viewport (isIntersecting false AND above, not just "not yet
        // visible on initial load") - boundingClientRect.top < 0 is what
        // distinguishes "scrolled past" from "haven't reached it yet".
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Lets other bottom-anchored floating UI (BackToTopButton) lift itself
  // above this bar while it's showing instead of covering its Buy button.
  useEffect(() => {
    if (visible) document.body.dataset.stickyBuyBar = "";
    else delete document.body.dataset.stickyBuyBar;
    return () => {
      delete document.body.dataset.stickyBuyBar;
    };
  }, [visible]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 dark:border-rose-950/40 dark:bg-background/95 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 lg:px-8">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg sm:h-12 sm:w-12">
          <ProductImage media={product.media} name={product.name} category={product.category} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{formatCurrency(product.price)}</p>
        </div>
        <button
          type="button"
          onClick={() => toggle(product.id, product.name)}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-foreground transition-colors hover:border-rose-300 hover:text-rose-600 dark:border-white/15"
        >
          <HeartIcon filled={isWishlisted} className={`h-4 w-4 ${isWishlisted ? "text-rose-600" : ""}`} />
        </button>
        <a
          href="#buy-box"
          className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
            isOutOfStock
              ? "pointer-events-none bg-black/10 text-foreground/40 dark:bg-white/10"
              : "bg-rose-600 text-background hover:bg-rose-700"
          }`}
        >
          {isOutOfStock ? "Out of stock" : "Buy now"}
        </a>
      </div>
    </div>
  );
}
