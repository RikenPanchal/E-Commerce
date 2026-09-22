import { isValidObjectId, Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { connectDB } from "@/lib/db/connectDB";
import Product, { type ProductDocument } from "@/models/Product";
import { saveProductMedia, deleteProductMediaFile, type SavedMedia } from "@/lib/media/storage";
import { slugify } from "@/lib/utils/slugify";
import { toProductView } from "@/lib/products/mapper";
import { processBackInStockTransition } from "@/lib/shop/backInStock";
import { LOW_STOCK_THRESHOLD } from "@/lib/shop/stock";
import { escapeRegExp } from "@/lib/utils/escapeRegExp";
import { variantComboKey } from "@/lib/validations/product";
import type { ProductInput } from "@/lib/validations/product";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/data/categories";
import type { ProductView } from "@/types/product";

export { toProductView };

/** Finds a free slug based on `name`, appending `-2`, `-3`, ... on collision. */
async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;

  for (;;) {
    const existing = await Product.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select("_id")
      .lean();

    if (!existing) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

/**
 * Saves every file, but if any one fails validation, deletes whatever
 * already succeeded before re-throwing - so a bad file in a batch never
 * leaves orphaned uploads behind.
 */
async function saveMediaOrCleanup(productId: string, files: File[]): Promise<SavedMedia[]> {
  const results = await Promise.allSettled(files.map((file) => saveProductMedia(productId, file)));
  const saved = results
    .filter((result): result is PromiseFulfilledResult<SavedMedia> => result.status === "fulfilled")
    .map((result) => result.value);
  const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

  if (failure) {
    await Promise.all(saved.map((item) => deleteProductMediaFile(item.url)));
    throw failure.reason;
  }

  return saved;
}

function generateSku(slug: string): string {
  const prefix = slug.slice(0, 12).toUpperCase().replace(/-/g, "");
  const suffix = randomUUID().slice(0, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

/** A variant SKU is optional (see `ProductVariant`) - this just saves the
 *  admin from typing one for every row when they leave it blank on create. */
function generateVariantSku(baseSku: string, color?: string, size?: string): string {
  const parts = [baseSku, color ? color.slice(0, 3).toUpperCase() : undefined, size].filter(Boolean);
  return parts.join("-");
}

/** Never trusts the client-sent list of complementary product ids at face
 *  value: drops the product's own id (self-reference, only possible on
 *  edit - a new product has no id yet when the admin builds this list) and
 *  anything that isn't a real, active product (deleted since it was picked,
 *  or a fabricated id from a direct API call bypassing the picker UI). */
async function resolveComplementaryProductIds(ids: string[], excludeId?: string): Promise<string[]> {
  const candidateIds = excludeId ? ids.filter((id) => id !== excludeId) : ids;
  if (candidateIds.length === 0) return [];

  const existing = await Product.find({ _id: { $in: candidateIds }, isDeleted: false }).select("_id");
  const existingIds = new Set(existing.map((product) => product._id.toString()));
  return candidateIds.filter((id) => existingIds.has(id));
}

/** When a product uses variants, the top-level `stock` becomes the sum of
 *  variant stocks - so listings/cards that only read `product.stock` (never
 *  `product.variants`) still show correct in-stock/out-of-stock state
 *  without needing to know about variants at all. Products without
 *  variants keep the admin's own top-level stock figure, unchanged. */
function resolveTopLevelStock(input: ProductInput): number {
  if (input.variants.length === 0) return input.stock;
  return input.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

/** Rows per page for the admin product list's infinite scroll. */
export const ADMIN_PRODUCTS_PAGE_SIZE = 20;

export type AdminStockFilter = "in" | "low" | "out";

export interface AdminProductFilters {
  /** Name or SKU, case-insensitive substring - the two things an admin
   *  actually types when hunting for one product. */
  search?: string;
  category?: ProductCategory;
  stockStatus?: AdminStockFilter;
}

/** Same three-way split the customer-facing "Only X left in stock" badge
 *  is built from (see `getStockStatus`) - so "low stock" means the same
 *  count here as it does on the storefront. "in" means available at all
 *  (comfortable or low), matching what a shopper could actually buy. */
function stockRangeFor(status: AdminStockFilter): Record<string, number> {
  if (status === "out") return { $lte: 0 };
  if (status === "low") return { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
  return { $gt: 0 };
}

function buildAdminProductFilter(filters?: AdminProductFilters): Record<string, unknown> {
  const query: Record<string, unknown> = { isDeleted: false };

  const search = filters?.search?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    query.$or = [{ name: pattern }, { sku: pattern }];
  }

  if (filters?.category) {
    query.category = filters.category;
  }

  if (filters?.stockStatus) {
    query.stock = stockRangeFor(filters.stockStatus);
  }

  return query;
}

function isValidCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

function isValidStockFilter(value: string): value is AdminStockFilter {
  return value === "in" || value === "low" || value === "out";
}

/** The one place that turns raw `?q=&category=&stock=` values into real,
 *  validated filters - shared by the admin page's first (server-rendered)
 *  page and the `/api/admin/products` route every later infinite-scroll
 *  page comes from, so a garbled/unknown value never means something
 *  different to one than the other. */
export function parseAdminProductFilters(searchParams: URLSearchParams): AdminProductFilters {
  const rawCategory = searchParams.get("category") ?? "";
  const rawStock = searchParams.get("stock") ?? "";
  return {
    search: searchParams.get("q") ?? "",
    category: isValidCategory(rawCategory) ? rawCategory : undefined,
    stockStatus: isValidStockFilter(rawStock) ? rawStock : undefined,
  };
}

/** Lowest stock first when auditing a stock-based view (restocking is
 *  urgent, most-recently-added isn't the useful order here); otherwise the
 *  usual newest-first listing. Shared by the unpaged and paged listings so
 *  the two can never silently disagree on ordering. `_id` is always
 *  appended as a tiebreaker - several products can share the same stock
 *  count or `createdAt`, and MongoDB doesn't guarantee a stable order for
 *  tied documents across separate `skip`/`limit` queries; without a unique
 *  tiebreaker the infinite-scroll list's page N and N+1 can each resolve a
 *  tie differently, duplicating one product while skipping another. */
function sortFor(filters?: AdminProductFilters): Record<string, 1 | -1> {
  return filters?.stockStatus === "low" || filters?.stockStatus === "out"
    ? { stock: 1, _id: 1 }
    : { createdAt: -1, _id: 1 };
}

export async function getActiveProducts(filters?: AdminProductFilters, limit = 200): Promise<ProductView[]> {
  await connectDB();
  const products = await Product.find(buildAdminProductFilter(filters)).sort(sortFor(filters)).limit(limit);
  return products.map(toProductView);
}

export interface PagedAdminProductsResult {
  products: ProductView[];
  hasMore: boolean;
}

/**
 * One page of the admin product list for infinite scroll, instead of
 * loading the entire (potentially large) catalog into the page at once.
 * Same filters/ordering as `getActiveProducts` - just windowed. Fetches one
 * extra row beyond `pageSize` to learn whether there's a next page without
 * a second, separately-racing count query.
 */
export async function getPagedActiveProducts(
  filters: AdminProductFilters | undefined,
  page: number,
  pageSize: number
): Promise<PagedAdminProductsResult> {
  await connectDB();
  const fetched = await Product.find(buildAdminProductFilter(filters))
    .sort(sortFor(filters))
    .skip(page * pageSize)
    .limit(pageSize + 1);

  const hasMore = fetched.length > pageSize;
  return { products: fetched.slice(0, pageSize).map(toProductView), hasMore };
}

/** Counts for each stock bucket across the *whole* active catalog (never
 *  narrowed by the current search/category filters) - so the filter chips
 *  always show "how many total", the same way a tab count would, rather
 *  than recursively depending on what's already filtered. */
export interface AdminStockCounts {
  all: number;
  in: number;
  low: number;
  out: number;
}

export async function getAdminStockCounts(): Promise<AdminStockCounts> {
  await connectDB();
  const [all, inStock, low, out] = await Promise.all([
    Product.countDocuments({ isDeleted: false }),
    Product.countDocuments({ isDeleted: false, stock: stockRangeFor("in") }),
    Product.countDocuments({ isDeleted: false, stock: stockRangeFor("low") }),
    Product.countDocuments({ isDeleted: false, stock: stockRangeFor("out") }),
  ]);
  return { all, in: inStock, low, out };
}

export async function getTrashedProducts(limit = 200): Promise<ProductView[]> {
  await connectDB();
  const products = await Product.find({ isDeleted: true }).sort({ deletedAt: -1 }).limit(limit);
  return products.map(toProductView);
}

export async function getProductViewById(id: string): Promise<ProductView | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();
  const product = await Product.findById(id);
  return product ? toProductView(product) : null;
}

export async function createProduct(
  input: ProductInput,
  files: File[]
): Promise<ProductDocument> {
  await connectDB();

  const slug = await generateUniqueSlug(input.name);
  const sku = input.sku?.trim() ? input.sku.toUpperCase() : generateSku(slug);
  const _id = new Types.ObjectId();
  const productId = _id.toString();

  const media = await saveMediaOrCleanup(productId, files);
  const stock = resolveTopLevelStock(input);
  const variants = input.variants.map((variant) => ({
    ...variant,
    sku: variant.sku?.trim() ? variant.sku : generateVariantSku(sku, variant.color, variant.size),
  }));
  const complementaryProductIds = await resolveComplementaryProductIds(input.complementaryProductIds, productId);

  try {
    return await Product.create({ _id, ...input, slug, sku, stock, variants, complementaryProductIds, media });
  } catch (error) {
    // Roll back any files already written before the DB write failed.
    await Promise.all(media.map((item) => deleteProductMediaFile(item.url)));
    throw error;
  }
}

export async function updateProductFields(
  id: string,
  input: ProductInput
): Promise<ProductDocument | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();

  const existing = await Product.findById(id).select("stock variants");
  if (!existing) {
    return null;
  }

  // Variant rows never carry their own `_id` back from the admin form (it's
  // a local-only React key - see `ProductForm`'s comment on `VariantRow`),
  // so casting a fresh plain-object array here would otherwise mint a brand
  // new ObjectId for every variant on every single save - permanently
  // orphaning anything that references a variant by id: already-placed
  // orders' line items, and back-in-stock alerts. Matching by (size, color)
  // - the same combination the form/schema already enforce as unique -
  // carries the real, stable id forward for a combo that already existed;
  // only a genuinely new combo gets a fresh one.
  const existingIdByCombo = new Map(existing.variants.map((variant) => [variantComboKey(variant), variant._id]));
  const variants = input.variants.map((variant) => {
    const existingId = existingIdByCombo.get(variantComboKey(variant));
    return existingId ? { _id: existingId, ...variant } : variant;
  });

  const slug = await generateUniqueSlug(input.name, id);
  const complementaryProductIds = await resolveComplementaryProductIds(input.complementaryProductIds, id);
  const update = {
    ...input,
    variants,
    slug,
    stock: resolveTopLevelStock(input),
    complementaryProductIds,
    sku: input.sku?.trim() ? input.sku.toUpperCase() : undefined,
  };
  if (!update.sku) {
    delete update.sku;
  }

  const updated = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!updated) {
    return null;
  }

  // Fire the back-in-stock trigger for every 0 -> positive crossing this
  // save just caused - never a separate polled stock check, always driven
  // by the exact write that just happened.
  if (existing.variants.length === 0 && updated.variants.length === 0) {
    if (existing.stock <= 0 && updated.stock > 0) {
      await processBackInStockTransition(updated._id, null, existing.stock, updated.stock);
    }
  } else {
    const oldStockById = new Map(existing.variants.map((variant) => [variant._id.toString(), variant.stock]));
    for (const variant of updated.variants) {
      const oldStock = oldStockById.get(variant._id.toString()) ?? 0;
      if (oldStock <= 0 && variant.stock > 0) {
        await processBackInStockTransition(updated._id, variant._id, oldStock, variant.stock);
      }
    }
  }

  return updated;
}

export async function addProductMedia(
  id: string,
  files: File[]
): Promise<ProductDocument | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();

  if (files.length === 0) {
    return Product.findById(id);
  }

  const saved = await saveMediaOrCleanup(id, files);
  const mediaWithIds = saved.map((item) => ({ _id: new Types.ObjectId(), ...item }));

  const updated = await Product.findByIdAndUpdate(
    id,
    { $push: { media: { $each: mediaWithIds } } },
    { new: true }
  );

  if (!updated) {
    // The product vanished mid-upload (e.g. deleted concurrently) - clean up.
    await Promise.all(saved.map((item) => deleteProductMediaFile(item.url)));
  }

  return updated;
}

export async function removeProductMedia(
  id: string,
  mediaIds: string[]
): Promise<ProductDocument | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();

  if (mediaIds.length === 0) {
    return Product.findById(id);
  }

  const existing = await Product.findById(id).select("media");
  if (!existing) {
    return null;
  }

  const idsToRemove = new Set(mediaIds);
  const removedUrls = existing.media
    .filter((item) => idsToRemove.has(item._id.toString()))
    .map((item) => item.url);

  const updated = await Product.findByIdAndUpdate(
    id,
    { $pull: { media: { _id: { $in: mediaIds } } } },
    { new: true }
  );

  await Promise.all(removedUrls.map((url) => deleteProductMediaFile(url)));
  return updated;
}

export async function softDeleteProduct(id: string): Promise<ProductDocument | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();
  return Product.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
}

export async function restoreProduct(id: string): Promise<ProductDocument | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();
  return Product.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null }, { new: true });
}
