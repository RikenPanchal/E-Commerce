// One product-id per entry, most-recently-viewed first - never the product
// data itself (see `RecentlyViewedProvider`'s doc comment for why).
export interface RecentlyViewedEntry {
  productId: string;
  viewedAt: number;
}

// A centralized cap, not a number repeated at every call site.
export const MAX_RECENTLY_VIEWED = 12;
