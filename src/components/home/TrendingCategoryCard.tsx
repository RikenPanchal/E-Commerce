import Link from "next/link";
import { ProductImage } from "@/components/shop/ProductImage";
import { ArrowRightIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductCategory } from "@/lib/data/categories";
import type { ProductView } from "@/types/product";

/**
 * Trending Now's card - deliberately NOT a product card at all: a real
 * CATEGORY tile (arched photo, a numbered index, the category name, and
 * its real current starting price), reusing whichever real product photo
 * best represents that category (see `getCategoryHighlights`) rather than
 * showing a specific product's own price/rating/wishlist state. The tile's
 * own photo is that one real product's photo, though - so it links straight
 * to that product's page (not a filtered category listing), since that's
 * the actual, specific item a visitor sees and clicks on.
 */
export function TrendingCategoryCard({
  category,
  product,
  index,
}: {
  category: ProductCategory;
  /** The real product whose photo represents this category - also where the
   *  tile links and whose own price is shown, since it's the specific item
   *  shown, not just a category. */
  product: ProductView;
  index: number;
}) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-full bg-rose-100">
        <ProductImage
          media={product.media}
          name={category}
          category={category}
          className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-serif text-3xl font-semibold text-white/90">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-4 text-center">
        <span className="block font-serif text-lg font-semibold text-foreground">{category}</span>
        <span className="mt-1 truncate text-xs text-muted-foreground">{product.name}</span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
          {formatCurrency(product.price)}
          <ArrowRightIcon className="h-3 w-3 transition-transform duration-300 ease-out group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
