import Link from "next/link";
import { ProductImage } from "@/components/shop/ProductImage";
import { WishlistHeartButton } from "@/components/home/WishlistHeartButton";
import { CloseIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductView } from "@/types/product";

/**
 * Recently Viewed's card - deliberately the lightest-weight of the five
 * homepage card designs: a small square thumbnail, name, price, and a
 * wishlist heart. No rating, no badge, no category label - "you already
 * looked at this once" carries less visual weight than a fresh
 * recommendation does.
 */
export function RecentlyViewedThumb({
  product,
  onRemove,
}: {
  product: ProductView;
  onRemove: (productId: string) => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onRemove(product.id)}
        aria-label={`Remove ${product.name} from recently viewed`}
        className="absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-surface text-foreground/60 shadow-sm transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        <CloseIcon className="h-3 w-3" />
      </button>

      <div className="relative">
        <Link href={`/products/${product.slug}`} className="relative block aspect-square w-full overflow-hidden bg-cream">
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
          className="absolute top-2 right-2 z-10 h-7 w-7"
        />
      </div>

      <div className="flex flex-col gap-0.5 pt-2">
        <Link
          href={`/products/${product.slug}`}
          className="block truncate text-xs font-medium text-foreground transition-colors hover:text-rose-400"
        >
          {product.name}
        </Link>
        <span className="text-xs font-semibold text-rose-400">{formatCurrency(product.price)}</span>
      </div>
    </div>
  );
}
