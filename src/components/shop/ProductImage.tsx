import { CategoryPlaceholder } from "@/components/shop/categoryArt";
import type { ProductCategory } from "@/lib/data/categories";
import type { ProductMediaView } from "@/types/product";

export function ProductImage({
  media,
  name,
  category,
  className = "",
  priority = false,
}: {
  media: ProductMediaView[];
  name: string;
  /** Picks which placeholder illustration to show when there's no photo -
   *  optional so existing call sites without a category still fall back
   *  gracefully instead of needing to be updated. */
  category?: ProductCategory;
  className?: string;
  /** True only for a real above-the-fold/LCP usage (the homepage hero, a
   *  collection page's hero pick) - every other call site (grids,
   *  scrollers, quick view, the sticky buy bar) defaults to lazy so the
   *  browser doesn't fight the actually-visible image for bandwidth. */
  priority?: boolean;
}) {
  const image = media.find((item) => item.type === "image");

  if (!image) {
    return (
      <div className={className}>
        <CategoryPlaceholder category={category} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.alt ?? `${name}${category ? ` - ${category}` : ""}`}
      className={`object-cover ${className}`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
