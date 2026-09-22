import { Schema, model, models, type Model, type HydratedDocument, type Types } from "mongoose";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/data/categories";
import { PRODUCT_SIZES, type ProductSize } from "@/lib/data/productOptions";

export interface ProductColor {
  name: string;
  hex?: string;
}

/**
 * An actual purchasable combination (e.g. Black + M) - optional and
 * additive. A product with an empty `variants` array behaves exactly as
 * before this field existed: one product-level price/stock/SKU, and `sizes`/
 * `colors` are just independent option lists. Every existing product in the
 * catalog has no variants and is unaffected. `size`/`color` are each
 * optional so a product can vary by only one dimension (size-only or
 * color-only); at least one must be set (enforced in the pre-validate hook
 * below) since a variant with neither isn't distinguishable from "no
 * variant". `price`/`compareAtPrice`/`sku` are themselves optional
 * overrides - when omitted, the variant inherits the product's own
 * top-level value.
 */
export interface ProductVariant {
  _id: Types.ObjectId;
  size?: ProductSize;
  color?: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  stock: number;
  isActive: boolean;
}

export interface ProductMediaItem {
  _id: Types.ObjectId;
  type: "image" | "video";
  url: string;
  alt?: string;
}

/** Optional admin overrides for this product's SEO metadata - every field
 *  falls back to something derived from the product's own real data (name,
 *  description, category, brand, price - see `buildProductMetadata`) when
 *  left blank, so SEO never breaks just because nobody filled these in. */
export interface ProductSeoAttributes {
  title?: string;
  description?: string;
  keywords: string[];
  canonicalUrl?: string;
  metaRobots: "index,follow" | "noindex,follow" | "noindex,nofollow";
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  /** Overrides the primary product photo's alt text specifically - the
   *  rest of the gallery keeps each image's own per-photo `alt`. */
  imageAlt?: string;
}

export interface ProductAttributes {
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  sizes: ProductSize[];
  colors: ProductColor[];
  variants: ProductVariant[];
  /** Admin-curated "Complete the Look" picks - real Product `_id`s the admin
   *  explicitly chose as complementary to this one (e.g. a dress -> a
   *  handbag), never a computed/similarity relationship. Optional and
   *  additive: empty for every product until an admin sets it, which falls
   *  back to a category-based complementary relationship instead (see
   *  `src/lib/shop/recommendations.ts`). */
  complementaryProductIds: Types.ObjectId[];
  material?: string;
  brand?: string;
  tags: string[];
  isFeatured: boolean;
  media: ProductMediaItem[];
  seo?: ProductSeoAttributes;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductDocument = HydratedDocument<ProductAttributes>;

const productMediaSchema = new Schema<ProductMediaItem>(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
    alt: { type: String, trim: true },
  },
  { _id: true }
);

const productColorSchema = new Schema<ProductColor>(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, trim: true },
  },
  { _id: false }
);

const productSeoSchema = new Schema<ProductSeoAttributes>(
  {
    title: { type: String, trim: true, maxlength: 70 },
    description: { type: String, trim: true, maxlength: 160 },
    keywords: { type: [String], default: [] },
    canonicalUrl: { type: String, trim: true, maxlength: 300 },
    metaRobots: {
      type: String,
      enum: ["index,follow", "noindex,follow", "noindex,nofollow"],
      default: "index,follow",
    },
    ogTitle: { type: String, trim: true, maxlength: 70 },
    ogDescription: { type: String, trim: true, maxlength: 200 },
    ogImageUrl: { type: String, trim: true, maxlength: 500 },
    imageAlt: { type: String, trim: true, maxlength: 125 },
  },
  { _id: false }
);

const productVariantSchema = new Schema<ProductVariant>(
  {
    size: { type: String, enum: [...PRODUCT_SIZES] },
    color: { type: String, trim: true },
    sku: { type: String, trim: true, uppercase: true },
    price: { type: Number, min: [0, "Price cannot be negative"] },
    compareAtPrice: { type: Number, min: [0, "Compare-at price cannot be negative"] },
    stock: { type: Number, required: true, min: [0, "Stock cannot be negative"], default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const productSchema = new Schema<ProductAttributes>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [120, "Name must be at most 120 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [5000, "Description must be at most 5000 characters"],
    },
    category: {
      type: String,
      enum: [...PRODUCT_CATEGORIES],
      required: [true, "Category is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    compareAtPrice: {
      type: Number,
      min: [0, "Compare-at price cannot be negative"],
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    sizes: {
      type: [String],
      enum: [...PRODUCT_SIZES],
      default: [],
    },
    colors: { type: [productColorSchema], default: [] },
    // Database-level guard against duplicate/malformed variants - the admin
    // API already validates this with Zod, but that alone isn't sufficient
    // (a direct write, or a future caller, could bypass it). A path-level
    // validator (rather than a `pre("validate")` document hook) is used
    // deliberately: it's the form Mongoose actually runs for
    // `findByIdAndUpdate`/`findOneAndUpdate` when `runValidators: true` is
    // passed, which is how `updateProductFields` saves edits - a document
    // hook would silently never fire on that path.
    variants: {
      type: [productVariantSchema],
      default: [],
      validate: {
        validator: (variants: ProductVariant[]) => {
          if (variants.length === 0) return true;
          const combos = new Set<string>();
          const skus = new Set<string>();
          for (const variant of variants) {
            if (!variant.size && !variant.color) return false;
            const comboKey = `${variant.size ?? ""}::${(variant.color ?? "").trim().toLowerCase()}`;
            if (combos.has(comboKey)) return false;
            combos.add(comboKey);
            if (variant.sku) {
              const skuKey = variant.sku.trim().toUpperCase();
              if (skus.has(skuKey)) return false;
              skus.add(skuKey);
            }
          }
          return true;
        },
        message:
          "Each variant needs a size, a color, or both, with no two variants sharing the same combination or SKU",
      },
    },
    // Self-reference can't be checked here: Mongoose doesn't reliably bind
    // `this` to the document for a path validator during
    // `findByIdAndUpdate`/`findOneAndUpdate` (only for `.save()`/`.create()`),
    // and an update is exactly when self-reference could happen (a product
    // can't reference itself on create - it has no id yet at that point).
    // `updateProductFields` filters the product's own id out explicitly instead.
    complementaryProductIds: {
      type: [Schema.Types.ObjectId],
      ref: "Product",
      default: [],
      validate: {
        validator: (ids: Types.ObjectId[]) => {
          if (ids.length > 8) return false;
          const seen = new Set<string>();
          for (const id of ids) {
            const key = id.toString();
            if (seen.has(key)) return false;
            seen.add(key);
          }
          return true;
        },
        message: "Complete the Look can't list duplicates or exceed 8 items",
      },
    },
    material: { type: String, trim: true },
    brand: { type: String, trim: true },
    tags: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    media: { type: [productMediaSchema], default: [] },
    seo: { type: productSeoSchema },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productSchema.index({ isDeleted: 1, createdAt: -1 });
productSchema.index({ "variants.sku": 1 }, { sparse: true });
// Every recommendation query (src/lib/shop/recommendations.ts) filters
// candidates by isDeleted + category together - this is the compound shape
// those queries actually use, not a speculative addition.
productSchema.index({ isDeleted: 1, category: 1 });

const Product: Model<ProductAttributes> =
  (models.Product as Model<ProductAttributes>) || model<ProductAttributes>("Product", productSchema);

export default Product;
