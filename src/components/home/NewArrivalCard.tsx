import Link from "next/link";
import { ProductImage } from "@/components/shop/ProductImage";
import { StarRating } from "@/components/shop/StarRating";
import { WishlistHeartButton } from "@/components/home/WishlistHeartButton";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";

/**
 * The New Arrivals card - deliberately different from `BestSellerCard`:
 * a taller, fashion-magazine aspect ratio (3/4 rather than 4/5) and a
 * strong "New" ribbon on every card (every item here genuinely is a new
 * arrival, unlike Best Sellers' single ranked ribbon).
 */
export function NewArrivalCard({ product, rating }: { product: ProductView; rating?: RatingSummary }) {
  return (
    <div className="group flex flex-col">
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="relative block aspect-[3/4] w-full overflow-hidden bg-background">
          <span className="absolute top-3 left-3 z-10 rounded-sm bg-rose-800 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-background uppercase">
            New
          </span>
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
        <span className="text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
          {product.category}
        </span>
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
