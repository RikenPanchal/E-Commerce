"use client";

import { PRODUCT_SORT_OPTIONS, type ProductSort } from "@/lib/shop/productSort";

const SORT_LABELS: Record<ProductSort, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "rating-desc": "Highest Rated",
};

/**
 * The toolbar's sort control - a real GET form (same `/shop` navigation
 * every other filter uses, no client-side re-sorting logic of its own),
 * just submitted automatically the moment the visitor picks an option
 * instead of waiting for a separate "Apply" click. `hiddenFields` carries
 * every other currently-active filter along so changing sort alone never
 * drops them.
 */
export function ShopSortSelect({
  sort,
  hiddenFields,
}: {
  sort: ProductSort;
  hiddenFields: { name: string; value: string }[];
}) {
  return (
    <form method="get" action="/shop" className="min-w-0 flex-1 sm:flex-none sm:shrink-0">
      {hiddenFields.map((field, index) => (
        <input key={`${field.name}-${index}`} type="hidden" name={field.name} value={field.value} />
      ))}
      <label className="sr-only" htmlFor="shop-sort">
        Sort by
      </label>
      <select
        id="shop-sort"
        name="sort"
        defaultValue={sort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="w-full rounded-md border border-surface-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-rose-500 sm:w-auto"
      >
        {PRODUCT_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            Sort: {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </form>
  );
}
