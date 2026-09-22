// Common size options offered on the product form. Colors are free-form
// (name + optional hex) since a fixed list would be too restrictive.

export const PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];
