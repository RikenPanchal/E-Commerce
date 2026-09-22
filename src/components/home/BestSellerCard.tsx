import Link from "next/link";
import { ProductImage } from "@/components/shop/ProductImage";
import { StarRating } from "@/components/shop/StarRating";
import { WishlistHeartButton } from "@/components/home/WishlistHeartButton";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";

/**
 * The Best Sellers card - image, an optional "Best Seller" ribbon (the
 * actual top-ranked product only, never every card), wishlist, rating,
 * name, price. Deliberately no Quick Add/Quick View icon clutter here -
 * this section reads as editorial, not a dense product-grid card; the
 * image itself still links through to the real product page where those
 * live.
 */
export function BestSellerCard({
  product,
  rating,
  isTopSeller = false,
}: {
  product: ProductView;
  rating?: RatingSummary;
  isTopSeller?: boolean;
}) {
  return (
    <div className="group flex flex-col">
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] w-full overflow-hidden bg-cream">
          {isTopSeller ? (
            <span className="absolute top-3 left-3 z-10 rounded-sm bg-rose-800 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-background uppercase">
              Best Seller
            </span>
          ) : null}
          <ProductImage
            media={product.media}
            name={product.name}
            category={product.category}
            className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </Link>
        <WishlistHeartButton
          productId={product.id}
          productName={product.name}
          className="absolute top-3 right-3 z-10"
        />
      </div>

      <div className="flex flex-col gap-1 pt-3">
        <Link
          href={`/products/${product.slug}`}
          className="block truncate font-serif text-base font-semibold text-foreground transition-colors hover:text-rose-800"
        >
          {product.name}
        </Link>
        <StarRating rating={rating?.average ?? 0} count={rating?.count ?? 0} />
        <span className="text-sm font-semibold text-rose-800">{formatCurrency(product.price)}</span>
      </div>
    </div>
  );
}
