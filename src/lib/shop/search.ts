import { connectDB } from "@/lib/db/connectDB";
import Product from "@/models/Product";
import { getPublicProducts } from "@/lib/shop/products";
import { isFuzzyMatch } from "@/lib/utils/fuzzyMatch";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";

export interface SearchSuggestionProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  image?: string;
}

export interface SearchSuggestions {
  products: SearchSuggestionProduct[];
  categories: string[];
}

const SUGGESTION_LIMIT = 6;

/**
 * Backs the header's live search dropdown - real catalog data only, no
 * hard-coded examples. Two layers, same as the Shop page's own search
 * (never a second, different search implementation):
 *
 * 1. The existing substring filter (`getPublicProducts({ search })`,
 *    already used by /shop and /api/products) - handles partial typing
 *    ("dre" -> "dress") and already covers name/description/tags/brand/
 *    category/color, whatever the product actually has.
 * 2. A fuzzy fallback (`isFuzzyMatch`) only engaged when that isn't enough
 *    results, scored against a bounded candidate pool - catches genuine
 *    misspellings ("drses") the substring pass can't, without a second
 *    database round trip per candidate.
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { products: [], categories: [] };
  }

  await connectDB();

  const exactMatches = await getPublicProducts({ search: trimmed, limit: SUGGESTION_LIMIT });
  const seenIds = new Set(exactMatches.map((product) => product.id));

  const fuzzyMatches: SearchSuggestionProduct[] = [];
  if (exactMatches.length < SUGGESTION_LIMIT) {
    // A bounded pool (not the whole catalog indefinitely) to score for
    // typo tolerance - cheap at this catalog's scale, and capped so a
    // larger catalog down the line can't make this an expensive scan.
    const candidates = await Product.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(300);
    for (const candidate of candidates) {
      if (seenIds.has(candidate.id)) continue;
      const colorNames = candidate.colors.map((color) => color.name).join(" ");
      const haystack = `${candidate.name} ${candidate.category} ${candidate.brand ?? ""} ${colorNames}`;
      if (isFuzzyMatch(trimmed, haystack)) {
        fuzzyMatches.push({
          id: candidate.id,
          slug: candidate.slug,
          name: candidate.name,
          price: candidate.price,
          compareAtPrice: candidate.compareAtPrice,
          category: candidate.category,
          image: candidate.media.find((item) => item.type === "image")?.url,
        });
        seenIds.add(candidate.id);
      }
      if (exactMatches.length + fuzzyMatches.length >= SUGGESTION_LIMIT) break;
    }
  }

  const products: SearchSuggestionProduct[] = [
    ...exactMatches.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      category: product.category,
      image: product.media.find((item) => item.type === "image")?.url,
    })),
    ...fuzzyMatches,
  ].slice(0, SUGGESTION_LIMIT);

  // Real categories only - a substring or close-spelling match against the
  // actual four categories this catalog has, never an invented one.
  const categories = PRODUCT_CATEGORIES.filter(
    (category) => category.toLowerCase().includes(trimmed.toLowerCase()) || isFuzzyMatch(trimmed, category)
  );

  return { products, categories };
}
