"use client";

import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { HeartIcon } from "@/components/home/icons";

/** The one wishlist toggle button, reused by every homepage card design -
 *  same `useWishlist()` hook and behavior `ProductCard` itself uses, just
 *  small enough to drop into a bespoke card layout without pulling in the
 *  rest of `ProductCard`. Always a sibling of the card's image `Link`
 *  (never nested inside it - a nested interactive element would be invalid
 *  HTML and would also trigger navigation on tap). */
export function WishlistHeartButton({
  productId,
  productName,
  className = "",
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const isWishlisted = has(productId);

  return (
    <button
      type="button"
      onClick={() => toggle(productId, productName)}
      aria-label={isWishlisted ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}
      aria-pressed={isWishlisted}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground hover:text-background ${className}`}
    >
      <HeartIcon filled={isWishlisted} className={`h-4 w-4 ${isWishlisted ? "text-rose-600" : ""}`} />
    </button>
  );
}
