export interface CartItem {
  /** For a variant product, `${productId}::variant::${variantId}` - the exact
   * variant IS the identity, so two different variants (Black/M vs Black/L)
   * always land on separate lines even if a future variant somehow shared a
   * size+color string. For a non-variant product (the common case today),
   * `${productId}::${size ?? ""}::${color ?? ""}`, unchanged from before
   * variants existed. */
  key: string;
  productId: string;
  /** Set only when this line is an exact variant of a product that uses the
   *  variant system - undefined for every non-variant product (the default). */
  variantId?: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  size?: string;
  color?: string;
  /** The variant's own SKU, when it has one - informational only (order
   *  history, support), never used to resolve the variant itself. */
  sku?: string;
  quantity: number;
  /** Stock at the time this was added - only used to cap the quantity stepper client-side;
   * the server always re-validates against live stock when the order is placed. */
  stockAtAdd: number;
}

export function makeCartKey(productId: string, size?: string, color?: string, variantId?: string): string {
  if (variantId) return `${productId}::variant::${variantId}`;
  return `${productId}::${size ?? ""}::${color ?? ""}`;
}
