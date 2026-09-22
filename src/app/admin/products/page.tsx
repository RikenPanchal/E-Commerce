import type { Metadata } from "next";
import Link from "next/link";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  getAdminStockCounts,
  getPagedActiveProducts,
  parseAdminProductFilters,
  type AdminStockFilter,
} from "@/lib/admin/products";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";
import { InfiniteAdminProductsTable } from "@/components/admin/products/InfiniteAdminProductsTable";

export const metadata: Metadata = {
  title: "Products",
};

const STOCK_FILTERS: { value: AdminStockFilter | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

/** Carries whichever of `search`/`category` are already set along with a
 *  new stock filter, so clicking a stock chip never discards the admin's
 *  other filters. */
function buildHref(params: { stock?: string; category?: string; search?: string }): string {
  const query = new URLSearchParams();
  if (params.search) query.set("q", params.search);
  if (params.category) query.set("category", params.category);
  if (params.stock && params.stock !== "all") query.set("stock", params.stock);
  const queryString = query.toString();
  return queryString ? `/admin/products?${queryString}` : "/admin/products";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawSearch = typeof params.q === "string" ? params.q : "";
  const rawCategory = typeof params.category === "string" ? params.category : "";
  const rawStock = typeof params.stock === "string" ? params.stock : "";

  // Reuses the exact same parsing `/api/admin/products` applies to every
  // later infinite-scroll page, so an unknown/garbled value is rejected
  // identically on page 0 and page 1+.
  const filters = parseAdminProductFilters(new URLSearchParams({ q: rawSearch, category: rawCategory, stock: rawStock }));
  const { category, stockStatus } = filters;

  const [{ products, hasMore }, stockCounts] = await Promise.all([
    getPagedActiveProducts(filters, 0, ADMIN_PRODUCTS_PAGE_SIZE),
    getAdminStockCounts(),
  ]);

  const countByFilter: Record<AdminStockFilter | "all", number> = {
    all: stockCounts.all,
    in: stockCounts.in,
    low: stockCounts.low,
    out: stockCounts.out,
  };

  const isFiltered = Boolean(rawSearch || category || stockStatus);

  // Every later page fetched by the infinite-scroll table uses this same
  // query (plus its own "page") - never "subtotal" or anything client-guessed.
  const pagingQuery = new URLSearchParams();
  if (rawSearch) pagingQuery.set("q", rawSearch);
  if (category) pagingQuery.set("category", category);
  if (stockStatus) pagingQuery.set("stock", stockStatus);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-foreground/60">
            {stockCounts.all} active product{stockCounts.all === 1 ? "" : "s"}
            {isFiltered ? " - showing filtered results" : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products/new"
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-rose-500"
          >
            Add product
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STOCK_FILTERS.map((filter) => {
          const isActive = (stockStatus ?? "all") === filter.value;
          return (
            <Link
              key={filter.value}
              href={buildHref({ search: rawSearch, category, stock: filter.value })}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-rose-600 bg-rose-600 text-background"
                  : "border-black/10 text-foreground/70 hover:border-rose-300 dark:border-white/15"
              }`}
            >
              {filter.label} ({countByFilter[filter.value]})
            </Link>
          );
        })}
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.02]"
      >
        {stockStatus ? <input type="hidden" name="stock" value={stockStatus} /> : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-xs font-medium text-foreground/60">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={rawSearch}
            placeholder="Name or SKU"
            className="h-10 w-56 rounded-md border border-black/10 bg-background px-3 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-xs font-medium text-foreground/60">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category ?? ""}
            className="h-10 rounded-md border border-black/10 bg-background px-3 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
          >
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-md bg-rose-600 px-5 text-sm font-medium text-background transition-colors hover:bg-rose-500"
        >
          Filter
        </button>
        {isFiltered ? (
          <Link
            href="/admin/products"
            className="flex h-10 items-center rounded-md border border-black/10 px-4 text-sm font-medium text-foreground/70 transition-colors hover:border-black/30 hover:text-foreground dark:border-white/15 dark:hover:border-white/30"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-black/5 text-xs uppercase tracking-wide text-foreground/50 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Price</th>
              <th className="px-6 py-3 font-medium">Stock</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <InfiniteAdminProductsTable
            key={pagingQuery.toString()}
            initialProducts={products}
            initialHasMore={hasMore}
            queryString={pagingQuery.toString()}
            emptyMessage={
              isFiltered ? (
                "No products match these filters."
              ) : (
                <>
                  No products yet.{" "}
                  <Link href="/admin/products/new" className="text-rose-600 underline dark:text-rose-400">
                    Add your first one
                  </Link>
                  .
                </>
              )
            }
          />
        </table>
      </div>
    </div>
  );
}
