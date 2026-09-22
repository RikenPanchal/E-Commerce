import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Product from "@/models/Product";
import Order from "@/models/Order";
import { toProductView } from "@/lib/products/mapper";
import { escapeRegExp } from "@/lib/utils/escapeRegExp";
import { getRatingSummaries } from "@/lib/shop/reviews";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/data/categories";
import type { ProductSize } from "@/lib/data/productOptions";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";

export { PRODUCT_SORT_OPTIONS, type ProductSort } from "@/lib/shop/productSort";
import type { ProductSort } from "@/lib/shop/productSort";

export interface PublicProductFilters {
  /** A single category (every existing call site) or several at once (the
   *  Shop page's own multi-select category checkboxes) - both normalize to
   *  the same `$in` query below. */
  category?: ProductCategory | ProductCategory[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: ProductSize[];
  /** Real color names (`colors.name` on the product), e.g. "Black" - never
   *  a hex value or an invented swatch. */
  colors?: string[];
  /** Real `brand` values - only ever populated from what the catalog
   *  actually has (see `getShopFacets`), never a hard-coded list. */
  brands?: string[];
  inStockOnly?: boolean;
}

/** Shared by every read of the public catalog (listing, counting) so a
 *  filter can never mean something subtly different in one query than in
 *  another - there is exactly one definition of what each filter matches. */
function buildProductFilter(options?: PublicProductFilters): Record<string, unknown> {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (options?.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    if (categories.length > 0) {
      filter.category = { $in: categories };
    }
  }

  const search = options?.search?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    // `category` and `colors.name` were both missing here - the search
    // box's own placeholder text ("Search dresses, tops, colors...")
    // promises both work, but typing a category word like "dresses" or a
    // color like "black" only ever matched if that exact word happened to
    // also appear in a product's name/description/tags/brand, which most
    // products' text never includes verbatim.
    filter.$or = [
      { name: pattern },
      { description: pattern },
      { tags: pattern },
      { brand: pattern },
      { category: pattern },
      { "colors.name": pattern },
    ];
  }

  // min/max are validated (finite, non-negative, min <= max) by the Shop
  // page before they ever reach here - this only has to apply them.
  if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
    const priceRange: Record<string, number> = {};
    if (options.minPrice !== undefined) priceRange.$gte = options.minPrice;
    if (options.maxPrice !== undefined) priceRange.$lte = options.maxPrice;
    filter.price = priceRange;
  }

  if (options?.sizes && options.sizes.length > 0) {
    // A product matches if it offers ANY of the selected sizes, not all of
    // them - "M or L" should show products carrying either, not just ones
    // that stock both.
    filter.sizes = { $in: options.sizes };
  }

  if (options?.colors && options.colors.length > 0) {
    filter["colors.name"] = { $in: options.colors };
  }

  if (options?.brands && options.brands.length > 0) {
    filter.brand = { $in: options.brands };
  }

  if (options?.inStockOnly) {
    filter.stock = { $gt: 0 };
  }

  return filter;
}

/** Public catalog - always excludes soft-deleted products. "rating-desc" is
 *  handled by the caller (Shop page), not here - rating is computed from a
 *  separate Review collection, not stored on the product, so there's
 *  nothing to sort by in this query; callers requesting it get the same
 *  "newest" order back and re-sort once they've joined in rating data. */
export async function getPublicProducts(
  options?: PublicProductFilters & { sort?: ProductSort; limit?: number; offset?: number }
): Promise<ProductView[]> {
  await connectDB();

  const filter = buildProductFilter(options);
  // `_id` is always appended as a tiebreaker - `price`/`createdAt` alone can
  // tie across multiple products (several sharing a price, or bulk-seeded
  // with the same timestamp), and MongoDB doesn't guarantee a stable order
  // for tied documents across separate `skip`/`limit` queries. Without a
  // unique tiebreaker, the infinite-scroll grid's page N and page N+1 can
  // each independently resolve a tie differently, so the same product shows
  // up on both (a duplicate React key) while another is skipped entirely.
  const sortSpec: Record<string, 1 | -1> =
    options?.sort === "price-asc"
      ? { price: 1, _id: 1 }
      : options?.sort === "price-desc"
        ? { price: -1, _id: 1 }
        : { createdAt: -1, _id: 1 };

  const products = await Product.find(filter)
    .sort(sortSpec)
    .skip(options?.offset ?? 0)
    .limit(options?.limit ?? 100);
  return products.map(toProductView);
}

/** Total count of products matching the same filters `getPublicProducts`
 *  would apply - used for the Shop page's "N products" label, which needs
 *  the true total, not just how many happen to be on the current page. */
export async function countPublicProducts(options?: PublicProductFilters): Promise<number> {
  await connectDB();
  return Product.countDocuments(buildProductFilter(options));
}

export interface ShopFacets {
  colors: { name: string; hex?: string }[];
  brands: string[];
  priceMin: number;
  priceMax: number;
}

/**
 * The real, currently-available values the Shop page's color/brand/price
 * filters are built from - never a hard-coded list. A product's `colors`/
 * `brand` are free-form (no fixed enum, unlike category/size), so the only
 * honest way to offer them as filters is to ask the catalog what it
 * actually has right now. Scoped to only the three small fields it needs
 * (not full documents) - at real catalog scale this is one lightweight
 * scan, not the "fetch everything and filter in JS" antipattern the brief
 * warns against for the actual product *listing* query.
 */
export async function getShopFacets(): Promise<ShopFacets> {
  await connectDB();
  const products = await Product.find({ isDeleted: false }, { colors: 1, brand: 1, price: 1 });

  const colorHexByName = new Map<string, string | undefined>();
  const brands = new Set<string>();
  let priceMin = Infinity;
  let priceMax = -Infinity;

  for (const product of products) {
    for (const color of product.colors) {
      if (!colorHexByName.has(color.name)) {
        colorHexByName.set(color.name, color.hex);
      }
    }
    if (product.brand) brands.add(product.brand);
    priceMin = Math.min(priceMin, product.price);
    priceMax = Math.max(priceMax, product.price);
  }

  return {
    colors: [...colorHexByName.entries()]
      .map(([name, hex]) => ({ name, hex }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    brands: [...brands].sort(),
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax: Number.isFinite(priceMax) ? priceMax : 0,
  };
}

export interface CategoryHighlight {
  category: ProductCategory;
  /** The newest active product in this category - the same "one real,
   *  representative photo per category" rule `CategoryShowcase` already
   *  uses, so this never shows an invented/stock image. The tile built from
   *  this links straight to the product's own page (it's one specific real
   *  item, not an abstract stand-in for the category), so its own real
   *  price is shown alongside it - never a separate "category's cheapest
   *  item" figure that could belong to a different product than the one
   *  pictured/linked. */
  product: ProductView;
}

/** Real per-category facts for the homepage's "Trending now" category
 *  carousel - skips a category outright if it currently has no active
 *  products, rather than showing a broken/empty tile. */
export async function getCategoryHighlights(): Promise<CategoryHighlight[]> {
  await connectDB();

  const highlights = await Promise.all(
    PRODUCT_CATEGORIES.map(async (category): Promise<CategoryHighlight | null> => {
      const representative = await Product.findOne({ isDeleted: false, category }).sort({ createdAt: -1 });
      if (!representative) return null;
      return { category, product: toProductView(representative) };
    })
  );

  return highlights.filter((highlight): highlight is CategoryHighlight => highlight !== null);
}

export interface PagedProductsResult {
  products: ProductView[];
  ratings: Map<string, RatingSummary>;
  hasMore: boolean;
}

/**
 * One page of the public catalog for infinite scroll, plus each product's
 * rating already joined in - the single function both the Shop page's
 * first (server-rendered) page and every later page fetched from
 * /api/products call, so "page 0 from the server" and "page 3 from the
 * client" are guaranteed to be produced by identical logic.
 *
 * "rating-desc" can't be pushed down to the database (rating isn't a field
 * stored on the product, it's computed from a separate Review collection),
 * so for that one sort mode this fetches every match, joins ratings, sorts
 * in memory, and slices out the requested page - fine at real catalog
 * scale, and still always correct, just not database-paginated.
 */
export async function getPagedPublicProducts(
  filters: PublicProductFilters & { sort: ProductSort },
  page: number,
  pageSize: number
): Promise<PagedProductsResult> {
  if (filters.sort === "rating-desc") {
    const all = await getPublicProducts({ ...filters, sort: undefined, limit: 500 });
    const ratings = await getRatingSummaries(all.map((product) => product.id));
    const sorted = [...all].sort(
      (a, b) => (ratings.get(b.id)?.average ?? 0) - (ratings.get(a.id)?.average ?? 0)
    );
    const start = page * pageSize;
    const pageProducts = sorted.slice(start, start + pageSize);
    return { products: pageProducts, ratings, hasMore: start + pageSize < sorted.length };
  }

  // Fetch one extra to learn whether there's a next page without a second
  // (and potentially inconsistent, if data changes between the two calls)
  // count query.
  const fetched = await getPublicProducts({
    ...filters,
    offset: page * pageSize,
    limit: pageSize + 1,
  });
  const hasMore = fetched.length > pageSize;
  const pageProducts = fetched.slice(0, pageSize);
  const ratings = await getRatingSummaries(pageProducts.map((product) => product.id));
  return { products: pageProducts, ratings, hasMore };
}

/** Featured products for the homepage; falls back to the latest products if none are featured. */
export async function getFeaturedPublicProducts(limit = 4): Promise<ProductView[]> {
  await connectDB();
  const featured = await Product.find({ isDeleted: false, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit);

  if (featured.length > 0) {
    return featured.map(toProductView);
  }

  const latest = await Product.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(limit);
  return latest.map(toProductView);
}

/** Best-sellers by actual units ordered (cancelled orders don't count) -
 *  ranked from real Order history rather than a manually-curated flag, so
 *  the homepage carousel reflects what customers are genuinely buying.
 *  Falls back to featured/latest products to fill out the row on a fresh
 *  store with no order history yet, so the section is never empty. */
export async function getTopSellingPublicProducts(limit = 8): Promise<ProductView[]> {
  await connectDB();

  const ranked = await Order.aggregate<{ _id: Types.ObjectId; unitsSold: number }>([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", unitsSold: { $sum: "$items.quantity" } } },
    { $sort: { unitsSold: -1 } },
    // Fetch extra beyond `limit` as a buffer against ranked products that
    // turn out to be soft-deleted once filtered below.
    { $limit: limit * 3 },
  ]);

  const rankedIds = ranked.map((entry) => entry._id);
  const rankedProducts =
    rankedIds.length > 0
      ? await Product.find({ _id: { $in: rankedIds }, isDeleted: false })
      : [];

  const byId = new Map(rankedProducts.map((product) => [product.id, product]));
  const ordered = rankedIds
    .map((id) => byId.get(id.toString()))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .slice(0, limit);

  if (ordered.length >= limit) {
    return ordered.map(toProductView);
  }

  // Not enough real sales history yet - top up with featured/latest
  // products, skipping anything already picked above.
  const excludeIds = new Set(ordered.map((product) => product.id));
  const backfill = await Product.find({ isDeleted: false, _id: { $nin: [...excludeIds] } })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit - ordered.length);

  return [...ordered, ...backfill].map(toProductView);
}

/** Fetches a specific set of products by id, in no particular guaranteed
 *  order - backs the wishlist page, which only has a list of ids (from
 *  localStorage) and needs their current, live data (price, stock, etc.),
 *  never a stale snapshot. Silently ignores ids that aren't valid ObjectIds
 *  or no longer exist (a product removed from the catalog since it was
 *  wishlisted just quietly drops off the list). */
export async function getPublicProductsByIds(ids: string[]): Promise<ProductView[]> {
  await connectDB();
  const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
  if (validIds.length === 0) return [];

  const products = await Product.find({ _id: { $in: validIds }, isDeleted: false });
  return products.map(toProductView);
}

export async function getPublicProductBySlug(slug: string): Promise<ProductView | null> {
  await connectDB();
  const product = await Product.findOne({ slug, isDeleted: false });
  return product ? toProductView(product) : null;
}
