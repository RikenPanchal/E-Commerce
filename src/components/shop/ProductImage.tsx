import { CategoryPlaceholder } from "@/components/shop/categoryArt";
import type { ProductCategory } from "@/lib/data/categories";
import type { ProductMediaView } from "@/types/product";

export function ProductImage({
  media,
  name,
  category,
  className = "",
}: {
  media: ProductMediaView[];
  name: string;
  /** Picks which placeholder illustration to show when there's no photo -
   *  optional so existing call sites without a category still fall back
   *  gracefully instead of needing to be updated. */
  category?: ProductCategory;
  className?: string;
}) {
  const image = media.find((item) => item.type === "image");

  if (!image) {
    return (
      <div className={className}>
        <CategoryPlaceholder category={category} />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.url} alt={image.alt ?? name} className={`object-cover ${className}`} />;
}
