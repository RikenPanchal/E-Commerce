// Pulled out of products.ts (which pulls in mongoose/the MongoDB driver -
// fine for server code, but leaks Node built-ins like `net`/`tls`/`fs` into
// any client bundle that imports from it) so a client component like
// `ShopSortSelect` can use the sort constant/type without dragging the
// entire server-only product-fetching module along with it.

export const PRODUCT_SORT_OPTIONS = ["newest", "price-asc", "price-desc", "rating-desc"] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];
