import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/data/categories";
import { PRODUCT_SIZES, type ProductSize } from "@/lib/data/productOptions";
import { PRODUCT_SORT_OPTIONS, type ProductSort } from "@/lib/shop/productSort";

// How many products a single page shows/fetches - defined once and shared
// by the Shop page's initial (server-rendered) page and the /api/products
// route's subsequent (infinite-scroll) pages, so they can never drift out
// of sync with each other.
export const SHOP_PAGE_SIZE = 12;

/** The raw shape both Next.js's `searchParams` prop and a parsed
 *  `URLSearchParams` naturally provide - one parser understands both.
 *  `category` and `color` are repeatable, the same way `size` already is
 *  (`?category=Dresses&category=Tops`) - every existing single-value link
 *  into `/shop?category=X` still parses fine as a one-item selection. */
export interface RawShopSearchParams {
  category?: string | string[];
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  size?: string | string[];
  color?: string | string[];
  brand?: string | string[];
  sort?: string;
  inStock?: string;
}

export interface ParsedShopFilters {
  categories: ProductCategory[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes: ProductSize[];
  /** Real color names as selected by the visitor - validated against the
   *  catalog's actual current colors (`getShopFacets`) by the caller, not
   *  here (this module has no database access), so an old/shared link
   *  naming a color no product carries anymore just matches nothing rather
   *  than erroring. */
  colors: string[];
  /** Real brand names - same validation note as `colors`. */
  brands: string[];
  sort: ProductSort;
  inStock: boolean;
}

function isProductCategory(value: string): value is ProductCategory {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory);
}

function isProductSort(value: string | undefined): value is ProductSort {
  return (PRODUCT_SORT_OPTIONS as readonly string[]).includes(value ?? "");
}

function parsePrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function toArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

/**
 * The one place that turns raw query params into real filters - used by
 * both the Shop page (server component, page 0) and the /api/products
 * route (every page after that), so a visitor's active filters are
 * guaranteed to mean exactly the same thing on every page they scroll to.
 */
export function parseShopFilters(raw: RawShopSearchParams): ParsedShopFilters {
  const categories = [...new Set(toArray(raw.category))].filter(isProductCategory);
  const search = raw.q?.trim() || undefined;

  let minPrice = parsePrice(raw.minPrice);
  let maxPrice = parsePrice(raw.maxPrice);
  // Swap rather than silently return zero results - a visitor who typed
  // the smaller number into the "max" box still gets a sensible range.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const sizes = [...new Set(toArray(raw.size))].filter((value): value is ProductSize =>
    (PRODUCT_SIZES as readonly string[]).includes(value)
  );
  const colors = [...new Set(toArray(raw.color))];
  const brands = [...new Set(toArray(raw.brand))];

  const sort = isProductSort(raw.sort) ? raw.sort : "newest";
  const inStock = raw.inStock === "1";

  return { categories, search, minPrice, maxPrice, sizes, colors, brands, sort, inStock };
}

/** Same parsing, starting from a real `URLSearchParams` (what the API
 *  route gets from the request URL) instead of Next's plain object shape. */
export function parseShopFiltersFromSearchParams(params: URLSearchParams): ParsedShopFilters {
  return parseShopFilters({
    category: params.getAll("category"),
    q: params.get("q") ?? undefined,
    minPrice: params.get("minPrice") ?? undefined,
    maxPrice: params.get("maxPrice") ?? undefined,
    size: params.getAll("size"),
    color: params.getAll("color"),
    brand: params.getAll("brand"),
    sort: params.get("sort") ?? undefined,
    inStock: params.get("inStock") ?? undefined,
  });
}

/** Builds the query string (no leading "/shop" or "?") for a given filter
 *  state - used both for the page's own Links and as the base string the
 *  client-side infinite scroll appends "&page=N" to. */
export function buildShopQueryString(filters: ParsedShopFilters): string {
  const query = new URLSearchParams();
  for (const category of filters.categories) query.append("category", category);
  if (filters.search) query.set("q", filters.search);
  if (filters.minPrice !== undefined) query.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) query.set("maxPrice", String(filters.maxPrice));
  for (const size of filters.sizes) query.append("size", size);
  for (const color of filters.colors) query.append("color", color);
  for (const brand of filters.brands) query.append("brand", brand);
  if (filters.sort !== "newest") query.set("sort", filters.sort);
  if (filters.inStock) query.set("inStock", "1");
  return query.toString();
}
