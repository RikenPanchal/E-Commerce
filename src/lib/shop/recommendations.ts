import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Product, { type ProductDocument } from "@/models/Product";
import { toProductView } from "@/lib/products/mapper";
import type { ProductCategory } from "@/lib/data/categories";
import type { ProductView } from "@/types/product";

/**
 * The one centralized recommendation engine - every surface that suggests
 * products (Product Page "You may also like", Cart "Complete your look",
 * the homepage's "Picked for you") calls into this file rather than each
 * inventing its own query. Purely rule-based, scored only from fields that
 * actually exist on the real Product schema: category, tags, brand, and
 * price. There is no subcategory, "collection", or style/occasion field in
 * this catalog, no ML model, and no analytics service, so none of those are
 * used as signals - a candidate that merely shares a category with the
 * product being viewed is still meaningfully more relevant than a random
 * one, which is what this ranks for.
 */

interface RecommendationSeed {
  id: string;
  category: ProductCategory;
  tags: string[];
  brand?: string;
  price: number;
}

function toSeed(product: ProductView): RecommendationSeed {
  return { id: product.id, category: product.category, tags: product.tags, brand: product.brand, price: product.price };
}

/** How relevant one candidate is to ONE seed - the building block both
 *  single- and multi-seed recommendations reduce to (multi-seed just takes
 *  the best score across all seeds, so a candidate strongly matching any
 *  one cart item, say, ranks well without needing to match all of them). */
function scoreAgainstSeed(candidate: ProductDocument, seed: RecommendationSeed): number {
  let score = 0;
  if (candidate.category === seed.category) score += 10;

  const candidateTags = new Set(candidate.tags);
  const sharedTags = seed.tags.filter((tag) => candidateTags.has(tag)).length;
  score += sharedTags * 3;

  if (seed.brand && candidate.brand === seed.brand) score += 4;

  // Price closeness, normalized against the seed's own price so it means
  // roughly the same thing for a ₹300 accessory as a ₹5,000 dress - within
  // 10% of the seed's price scores close to full marks, tapering to zero
  // by the time a candidate is 100%+ away.
  if (seed.price > 0) {
    const relativeDiff = Math.abs(candidate.price - seed.price) / seed.price;
    score += Math.max(0, 5 * (1 - Math.min(1, relativeDiff)));
  }

  return score;
}

function rankCandidates(candidates: ProductDocument[], seeds: RecommendationSeed[], limit: number): ProductView[] {
  const scored = candidates.map((candidate) => ({
    candidate,
    score: Math.max(...seeds.map((seed) => scoreAgainstSeed(candidate, seed))),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.candidate.createdAt.getTime() - a.candidate.createdAt.getTime();
  });
  return scored.slice(0, limit).map((entry) => toProductView(entry.candidate));
}

/** Tops a short list up to `limit` with the freshest other products,
 *  skipping anything already picked/excluded - the same backfill idea
 *  `getFeaturedPublicProducts`/`getTopSellingPublicProducts` already use so
 *  a thin catalog or a narrow category never leaves a section showing
 *  fewer items than it could. */
async function backfill(existing: ProductView[], excludeIds: string[], limit: number): Promise<ProductView[]> {
  if (existing.length >= limit) return existing;
  const allExcluded = [...excludeIds, ...existing.map((product) => product.id)];
  const more = await Product.find({ isDeleted: false, _id: { $nin: allExcluded } })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit - existing.length);
  return [...existing, ...more.map(toProductView)];
}

/**
 * "You may also like" for a single product (the Product Page, and Quick
 * View's "View full details" destination). Replaces the old
 * `getRelatedPublicProducts` (price-proximity-within-category only) with
 * the shared scorer, which also weighs shared tags (real fabric/style tags
 * every product actually has, e.g. "cotton", "silk") and brand.
 */
export async function getRecommendedProducts(
  product: ProductView,
  excludeIds: string[] = [],
  limit = 8
): Promise<ProductView[]> {
  await connectDB();

  const excluded = [product.id, ...excludeIds];
  const sameCategory = await Product.find({
    isDeleted: false,
    category: product.category,
    _id: { $nin: excluded },
  }).limit(Math.max(limit * 4, 40));

  const ranked = rankCandidates(sameCategory, [toSeed(product)], limit);
  return backfill(ranked, excluded, limit);
}

/**
 * Multi-seed recommendations - "Complete your look" (seeded by what's in
 * the cart) and the homepage's "Picked for you" (seeded by Recently Viewed)
 * both call this with a different source of seed ids. A candidate only
 * needs to be a strong match for ONE seed, not all of them.
 */
export async function getRecommendedProductsForMany(
  seedProductIds: string[],
  excludeIds: string[] = [],
  limit = 8
): Promise<ProductView[]> {
  await connectDB();

  const validSeedIds = seedProductIds.filter((id) => Types.ObjectId.isValid(id));
  if (validSeedIds.length === 0) return [];

  const seedProducts = await Product.find({ _id: { $in: validSeedIds } });
  if (seedProducts.length === 0) return [];

  const seeds = seedProducts.map((product) => toSeed(toProductView(product)));
  const categories = [...new Set(seeds.map((seed) => seed.category))];
  const excluded = [...validSeedIds, ...excludeIds];

  const candidates = await Product.find({
    isDeleted: false,
    category: { $in: categories },
    _id: { $nin: excluded },
  }).limit(Math.max(limit * 4, 40));

  const ranked = rankCandidates(candidates, seeds, limit);
  return backfill(ranked, excluded, limit);
}

/** A category's freshest products, for the Shop page's "More in {category}"
 *  strip when a customer has filtered down to exactly one category - no
 *  single product to score relevance against here, so this is honestly
 *  just "what else is in this category" rather than dressing up a plain
 *  listing as a personalized score. */
export async function getRecommendedProductsForCategory(
  category: ProductCategory,
  excludeIds: string[] = [],
  limit = 8
): Promise<ProductView[]> {
  await connectDB();
  const products = await Product.find({ isDeleted: false, category, _id: { $nin: excludeIds } })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit);
  return products.map(toProductView);
}

/**
 * "Complete the Look" - COMPLEMENTARY discovery (a dress -> a bag), not the
 * similarity ranking above (a dress -> other dresses). Deliberately a
 * separate, smaller piece of logic rather than a mode flag on the scorer
 * above: the two answer different questions, and conflating them was
 * exactly what the spec warned against ("another black dress is similar,
 * not complete-the-look").
 *
 * Two tiers, in priority order:
 *  1. Admin-curated `complementaryProductIds` - an explicit human decision,
 *     the only way this can ever claim a *specific* pairing.
 *  2. A configurable category-relationship map, used only to fill out the
 *     list when curation doesn't (fully) cover it - this app's real
 *     category list is just Dresses / Tops & Blouses / Ethnic Wear /
 *     Accessories, with no subcategory or "collection" field, so that's the
 *     only complementary relationship that can be inferred without
 *     guessing. A category never lists itself: that would just be "You may
 *     also like" wearing a different heading.
 */
const COMPLEMENTARY_CATEGORIES: Record<ProductCategory, ProductCategory[]> = {
  Dresses: ["Accessories"],
  "Tops & Blouses": ["Accessories"],
  "Ethnic Wear": ["Accessories"],
  Accessories: ["Dresses", "Tops & Blouses", "Ethnic Wear"],
};

async function resolveCuratedComplements(curatedIds: string[], excludeIds: string[]): Promise<ProductView[]> {
  const excluded = new Set(excludeIds);
  const candidateIds = curatedIds.filter((id) => !excluded.has(id));
  if (candidateIds.length === 0) return [];
  const products = await Product.find({ _id: { $in: candidateIds }, isDeleted: false });
  // Preserve the admin's own ordering rather than whatever order MongoDB
  // happens to return - it's a deliberately curated list.
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  return candidateIds
    .map((id) => byId.get(id))
    .filter((product): product is ProductDocument => Boolean(product))
    .map(toProductView);
}

/** Single-product seed - the Product Page's "Complete the Look". */
export async function getCompleteTheLookProducts(product: ProductView, limit = 6): Promise<ProductView[]> {
  await connectDB();

  const excluded = [product.id];
  const curated = await resolveCuratedComplements(product.complementaryProductIds, excluded);
  excluded.push(...curated.map((item) => item.id));

  if (curated.length >= limit) {
    return curated.slice(0, limit);
  }

  const complementaryCategories = COMPLEMENTARY_CATEGORIES[product.category] ?? [];
  if (complementaryCategories.length === 0) {
    return curated;
  }

  const fallback = await Product.find({
    isDeleted: false,
    category: { $in: complementaryCategories },
    _id: { $nin: excluded },
  })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit - curated.length);

  return [...curated, ...fallback.map(toProductView)];
}

/** Multi-product seed - Cart's "Complete your look", seeded by everything
 *  currently in the bag. Unions each cart item's curated picks and
 *  complementary categories rather than requiring a candidate to relate to
 *  every item at once. */
export async function getCompleteTheLookProductsForMany(
  seedProductIds: string[],
  excludeIds: string[] = [],
  limit = 6
): Promise<ProductView[]> {
  await connectDB();

  const validSeedIds = seedProductIds.filter((id) => Types.ObjectId.isValid(id));
  if (validSeedIds.length === 0) return [];

  const seedProducts = await Product.find({ _id: { $in: validSeedIds } });
  if (seedProducts.length === 0) return [];

  const excluded = [...validSeedIds, ...excludeIds];
  const curatedIds = [...new Set(seedProducts.flatMap((product) => product.complementaryProductIds.map((id) => id.toString())))];
  const curated = await resolveCuratedComplements(curatedIds, excluded);
  excluded.push(...curated.map((item) => item.id));

  if (curated.length >= limit) {
    return curated.slice(0, limit);
  }

  const complementaryCategories = [
    ...new Set(seedProducts.flatMap((product) => COMPLEMENTARY_CATEGORIES[product.category] ?? [])),
  ];
  if (complementaryCategories.length === 0) {
    return curated;
  }

  const fallback = await Product.find({
    isDeleted: false,
    category: { $in: complementaryCategories },
    _id: { $nin: excluded },
  })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit - curated.length);

  return [...curated, ...fallback.map(toProductView)];
}
