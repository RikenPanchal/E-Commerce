import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";
import { PRODUCT_SIZES } from "@/lib/data/productOptions";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const productColorSchema = z.object({
  name: z.string().trim().min(1, "Color name is required").max(40, "Color name is too long"),
  hex: z.string().trim().regex(HEX_COLOR_PATTERN, "Hex must look like #RRGGBB").optional(),
});

// A variant is optional and additive - a product that never sets any stays
// exactly as it behaved before variants existed (see `ProductVariant` in the
// Product model). `size`/`color` are each optional (a product may vary by
// only one dimension) but at least one must be set, checked below.
export const productVariantSchema = z.object({
  size: z.enum(PRODUCT_SIZES).optional(),
  color: z.string().trim().max(40, "Color name is too long").optional(),
  sku: z.string().trim().max(40, "SKU is too long").optional(),
  price: z.coerce.number().min(0, "Price cannot be negative").optional(),
  compareAtPrice: z.coerce.number().min(0, "Compare-at price cannot be negative").optional(),
  stock: z.coerce
    .number("Stock must be a number")
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  isActive: z.boolean().default(true),
});

export function variantComboKey(variant: { size?: string; color?: string }): string {
  return `${variant.size ?? ""}::${(variant.color ?? "").trim().toLowerCase()}`;
}

const variantsFieldSchema = z
  .array(productVariantSchema)
  .max(200, "Too many variants")
  .default([])
  .refine(
    (variants) => variants.every((variant) => variant.size !== undefined || (variant.color ?? "").trim() !== ""),
    { message: "Each variant needs a size, a color, or both" }
  )
  .refine(
    (variants) => {
      const seen = new Set<string>();
      for (const variant of variants) {
        const key = variantComboKey(variant);
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    },
    { message: "Two variants can't share the same size and color" }
  )
  .refine(
    (variants) => {
      const seen = new Set<string>();
      for (const variant of variants) {
        if (!variant.sku) continue;
        const key = variant.sku.trim().toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    },
    { message: "Variant SKUs must be unique" }
  );

// The edit form always resubmits every field (not a partial patch), so the
// same schema covers both create and update - media is validated separately.
export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name is too long"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description is too long"),
  category: z.enum(PRODUCT_CATEGORIES, "Choose a valid category"),
  price: z.coerce.number("Price must be a number").min(0, "Price cannot be negative"),
  compareAtPrice: z.coerce.number().min(0, "Compare-at price cannot be negative").optional(),
  sku: z.string().trim().max(40, "SKU is too long").optional(),
  stock: z.coerce
    .number("Stock must be a number")
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  sizes: z.array(z.enum(PRODUCT_SIZES)).max(PRODUCT_SIZES.length).default([]),
  colors: z.array(productColorSchema).max(20, "Too many colors").default([]),
  variants: variantsFieldSchema,
  // Admin-curated "Complete the Look" picks - real Product ids only. Self-
  // reference and existence are checked in `updateProductFields`/
  // `createProduct` (this schema alone can't know the product's own id on
  // an update, or whether an id is real, without a database round trip).
  complementaryProductIds: z
    .array(z.string().refine(isValidObjectId, "Invalid product reference"))
    .max(8, "Choose at most 8 complementary products")
    .default([])
    .refine((ids) => new Set(ids).size === ids.length, { message: "Duplicate complementary product" }),
  material: z.string().trim().max(100, "Material is too long").optional(),
  brand: z.string().trim().max(60, "Brand is too long").optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20, "Too many tags").default([]),
  isFeatured: z.boolean().default(false),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;

function readJsonArray(formData: FormData, key: string): unknown {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Converts the multipart form fields (text side) into a plain object for `productSchema`. */
export function productFormDataToObject(formData: FormData): Record<string, unknown> {
  const readString = (key: string): string | undefined => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
  };

  return {
    name: readString("name"),
    description: readString("description"),
    category: readString("category"),
    price: readString("price"),
    compareAtPrice: readString("compareAtPrice"),
    sku: readString("sku"),
    stock: readString("stock"),
    sizes: readJsonArray(formData, "sizes"),
    colors: readJsonArray(formData, "colors"),
    variants: readJsonArray(formData, "variants"),
    complementaryProductIds: readJsonArray(formData, "complementaryProductIds"),
    material: readString("material"),
    brand: readString("brand"),
    tags: readJsonArray(formData, "tags"),
    isFeatured: formData.get("isFeatured") === "true",
  };
}
