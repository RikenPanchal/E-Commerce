import type { ProductSize } from "@/lib/data/productOptions";
import type { ProductVariantView, ProductView } from "@/types/product";

/**
 * The one variant-resolution algorithm, shared by `AddToCartForm` (product
 * page + Quick View, which renders it directly) and `QuickAddSheet` (Quick
 * Add) - so there is exactly one implementation of "what does Black + M
 * actually resolve to" for the whole app to ever disagree with. Pure
 * functions only, operating on the `ProductView` already in hand - no
 * fetching, no state.
 *
 * A product with an empty `variants` array (every product in the catalog
 * today) isn't affected by any of this: `hasVariants` is false, and every
 * caller falls back to the exact behavior that existed before variants did
 * (independent `sizes`/`colors` lists, one product-level price/stock/SKU).
 */

export function hasVariants(product: ProductView): boolean {
  return product.variants.length > 0;
}

/** Which dimensions this product's variants actually vary by - some variant
 *  products use only size, only color, or both. */
export function variantDimensions(product: ProductView): { needsSize: boolean; needsColor: boolean } {
  return {
    needsSize: product.variants.some((variant) => variant.size !== undefined),
    needsColor: product.variants.some((variant) => variant.color !== undefined),
  };
}

/** Sizes with at least one active, in-stock variant - optionally narrowed to
 *  a specific color once one is selected (undefined = don't filter by color yet). */
export function availableSizesFor(product: ProductView, color?: string): Set<ProductSize> {
  const sizes = new Set<ProductSize>();
  for (const variant of product.variants) {
    if (!variant.isActive || variant.stock <= 0) continue;
    if (color !== undefined && (variant.color ?? "") !== color) continue;
    if (variant.size) sizes.add(variant.size);
  }
  return sizes;
}

/** Colors with at least one active, in-stock variant - optionally narrowed
 *  to a specific size once one is selected. */
export function availableColorsFor(product: ProductView, size?: string): Set<string> {
  const colors = new Set<string>();
  for (const variant of product.variants) {
    if (!variant.isActive || variant.stock <= 0) continue;
    if (size !== undefined && (variant.size ?? "") !== size) continue;
    if (variant.color) colors.add(variant.color);
  }
  return colors;
}

export function isSizeAvailable(product: ProductView, size: ProductSize, color?: string): boolean {
  if (!hasVariants(product)) return true;
  return availableSizesFor(product, color).has(size);
}

export function isColorAvailable(product: ProductView, color: string, size?: string): boolean {
  if (!hasVariants(product)) return true;
  return availableColorsFor(product, size).has(color);
}

/** The exact variant for a size/color pair, if this combination exists at
 *  all (regardless of whether it's active or in stock - callers decide how
 *  to present an inactive/out-of-stock match). */
export function findVariant(product: ProductView, size?: string, color?: string): ProductVariantView | undefined {
  return product.variants.find(
    (variant) => (variant.size ?? "") === (size ?? "") && (variant.color ?? "") === (color ?? "")
  );
}

export interface ResolvedVariant {
  variant: ProductVariantView;
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku?: string;
  isAvailable: boolean;
}

/** Resolves the exact purchasable variant, with its effective price (falling
 *  back to the product's own price/compareAtPrice/SKU when the variant
 *  doesn't override them) - the one thing the whole purchase flow (price
 *  shown, stock checked, SKU/variant id sent to the cart) should read from. */
export function resolveVariant(product: ProductView, size?: string, color?: string): ResolvedVariant | undefined {
  const variant = findVariant(product, size, color);
  if (!variant) return undefined;
  return {
    variant,
    price: variant.price ?? product.price,
    compareAtPrice: variant.compareAtPrice ?? product.compareAtPrice,
    stock: variant.stock,
    sku: variant.sku ?? product.sku,
    isAvailable: variant.isActive && variant.stock > 0,
  };
}
