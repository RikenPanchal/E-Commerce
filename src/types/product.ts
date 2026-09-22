import type { ProductCategory } from "@/lib/data/categories";
import type { ProductSize } from "@/lib/data/productOptions";

export interface ProductColorView {
  name: string;
  hex?: string;
}

/** An actual purchasable combination - see `ProductVariant` in the Product
 *  model for the full explanation. Optional/additive: `variants` is empty
 *  for every product that doesn't use per-combination pricing/stock. */
export interface ProductVariantView {
  id: string;
  size?: ProductSize;
  color?: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  stock: number;
  isActive: boolean;
}

export interface ProductMediaView {
  id: string;
  type: "image" | "video";
  url: string;
  alt?: string;
}

/** Product shape sent to the client - Mongo internals mapped to plain values. */
export interface ProductView {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  sizes: ProductSize[];
  colors: ProductColorView[];
  variants: ProductVariantView[];
  /** Admin-curated "Complete the Look" product ids - see `ProductVariant`'s
   *  sibling doc comment on the model for the full explanation. */
  complementaryProductIds: string[];
  material?: string;
  brand?: string;
  tags: string[];
  isFeatured: boolean;
  media: ProductMediaView[];
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSuccessResponse {
  success: true;
  product: ProductView;
}

export interface ProductErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type ProductResponse = ProductSuccessResponse | ProductErrorResponse;
