import type { Metadata } from "next";
import Link from "next/link";
import { countPublicProducts, getPagedPublicProducts, getShopFacets } from "@/lib/shop/products";
import {
  buildShopQueryString,
  parseShopFilters,
  SHOP_PAGE_SIZE,
  type ParsedShopFilters,
  type RawShopSearchParams,
} from "@/lib/shop/shopFilters";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";
import { PRODUCT_SIZES } from "@/lib/data/productOptions";
import { InfiniteProductGrid } from "@/components/shop/InfiniteProductGrid";
import { ShopFilterDrawer } from "@/components/shop/ShopFilterDrawer";
import { ShopSortSelect } from "@/components/shop/ShopSortSelect";
import { FilterSection } from "@/components/shop/FilterSection";
import { PriceRangeSlider } from "@/components/shop/PriceRangeSlider";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { SearchIcon, FilterIcon, CloseIcon } from "@/components/home/icons";
import { RecentlyViewedSection } from "@/components/recentlyViewed/RecentlyViewedSection";
import { getRecommendedProductsForCategory } from "@/lib/shop/recommendations";
import { ProductScroller } from "@/components/home/ProductScroller";
import { getRatingSummaries } from "@/lib/shop/reviews";
import type { ProductWithRating } from "@/app/api/products/route";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo/structuredData";

/**
 * Only the base `/shop` and a single `?category=` selection are real SEO
 * landing pages - every other filter combination (search, multi-category,
 * size/color/brand/price/in-stock) is a valid, fully-functional page for
 * shoppers but not a distinct page worth indexing (thin/duplicate content
 * against the base catalog), so it gets `noindex,follow` with a canonical
 * pointing back to the clean base/category URL. See section 8 of the SEO
 * brief ("Search + Filter SEO").
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawShopSearchParams>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const current = parseShopFilters(raw);
  const { categories, search, sizes, colors, brands, minPrice, maxPrice, inStock } = current;
  const singleCategory = categories.length === 1 ? categories[0] : undefined;

  const hasOtherFilters =
    sizes.length > 0 ||
    colors.length > 0 ||
    brands.length > 0 ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    inStock ||
    categories.length > 1;
  const isIndexable = !search && !hasOtherFilters;

  const canonicalPath = singleCategory ? `/shop?category=${encodeURIComponent(singleCategory)}` : "/shop";
  const title = search ? `Search results for "${search}"` : singleCategory ? singleCategory : "Shop";
  const description = singleCategory
    ? `Shop the ${singleCategory} edit - browse our latest ${singleCategory.toLowerCase()} styles, with sizes and colors in stock.`
    : "Browse our full catalog of women's fashion - dresses, tops, ethnic wear and accessories, with real-time sizes and colors in stock.";

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: isIndexable, follow: true },
  };
}

function buildShopHref(overrides: Partial<ParsedShopFilters>, current: ParsedShopFilters): string {
  const queryString = buildShopQueryString({ ...current, ...overrides });
  return queryString ? `/shop?${queryString}` : "/shop";
}

const railLinkClass =
  "group relative shrink-0 py-1 text-xs font-medium tracking-[0.08em] whitespace-nowrap text-foreground/70 uppercase transition-colors hover:text-rose-500";
const railUnderlineClass = "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-rose-800 transition-transform duration-200";

// Shared by every checkbox-as-pill filter (Category, Size, Brand) - a real
// checkbox (keyboard/screen-reader accessible, part of the one filter
// form) visually hidden in favor of a styled sibling, toggled purely via
// CSS `peer-checked` so the pill highlights immediately on click with no
// JS, even though the filter itself only takes effect on "Apply filters".
const pillLabelClass =
  "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-surface-border px-3 text-xs font-medium text-foreground/70 transition-colors peer-checked:border-rose-800 peer-checked:bg-blush peer-checked:text-rose-800 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-500 peer-focus-visible:ring-offset-2";

/**
 * The Shop page - same underlying real data/filtering as before this pass
 * (`parseShopFilters`, `getPagedPublicProducts`, real GET-form navigation,
 * `/api/products` for infinite-scroll pages after this one), extended with
 * every filter the actual product schema supports: category (now
 * multi-select), size, color (real swatches from `getShopFacets`), a price
 * range slider bounded by the catalog's real min/max, brand, and
 * availability. No rating filter - the review collection is empty right
 * now, so there is no real rating data to filter by yet.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawShopSearchParams>;
}) {
  const raw = await searchParams;
  const current = parseShopFilters(raw);
  const { categories, search, minPrice, maxPrice, sizes, colors, brands, sort, inStock } = current;

  const hrefWith = (overrides: Partial<ParsedShopFilters>) => buildShopHref(overrides, current);

  const productFilters = { category: categories, search, minPrice, maxPrice, sizes, colors, brands, inStockOnly: inStock };

  // Page 0 only - everything after this comes from /api/products as the
  // visitor scrolls, via InfiniteProductGrid, using the exact same paging
  // function so page 0 and page 12 are never filtered differently.
  const [{ products: sortedProducts, ratings, hasMore }, totalCount, facets] = await Promise.all([
    getPagedPublicProducts({ ...productFilters, sort }, 0, SHOP_PAGE_SIZE),
    countPublicProducts(productFilters),
    getShopFacets(),
  ]);
  const productsWithRatings: ProductWithRating[] = sortedProducts.map((product) => ({
    ...product,
    rating: ratings.get(product.id),
  }));
  const nextPagesQueryString = buildShopQueryString(current);

  const activeFilterCount =
    categories.length +
    sizes.length +
    colors.length +
    brands.length +
    (minPrice !== undefined ? 1 : 0) +
    (maxPrice !== undefined ? 1 : 0) +
    (inStock ? 1 : 0);
  const hasAnyFilter = Boolean(search || activeFilterCount > 0 || sort !== "newest");

  // Every currently-active filter except `sort` itself, carried as hidden
  // fields on the toolbar's sort form so switching sort order never drops
  // the rest of what's selected.
  const sortHiddenFields: { name: string; value: string }[] = [
    ...categories.map((category) => ({ name: "category", value: category })),
    ...(search ? [{ name: "q", value: search }] : []),
    ...(minPrice !== undefined ? [{ name: "minPrice", value: String(minPrice) }] : []),
    ...(maxPrice !== undefined ? [{ name: "maxPrice", value: String(maxPrice) }] : []),
    ...sizes.map((size) => ({ name: "size", value: size })),
    ...colors.map((color) => ({ name: "color", value: color })),
    ...brands.map((brand) => ({ name: "brand", value: brand })),
    ...(inStock ? [{ name: "inStock", value: "1" }] : []),
  ];

  // One flat list of removable chips - every active filter in one place,
  // not only what's inside the sidebar/drawer.
  const activeChips: { key: string; label: string; href: string }[] = [
    ...categories.map((category) => ({
      key: `category-${category}`,
      label: category,
      href: hrefWith({ categories: categories.filter((item) => item !== category) }),
    })),
    ...(search ? [{ key: "search", label: `"${search}"`, href: hrefWith({ search: undefined }) }] : []),
    ...sizes.map((size) => ({
      key: `size-${size}`,
      label: `Size ${size}`,
      href: hrefWith({ sizes: sizes.filter((item) => item !== size) }),
    })),
    ...colors.map((color) => ({
      key: `color-${color}`,
      label: color,
      href: hrefWith({ colors: colors.filter((item) => item !== color) }),
    })),
    ...brands.map((brand) => ({
      key: `brand-${brand}`,
      label: brand,
      href: hrefWith({ brands: brands.filter((item) => item !== brand) }),
    })),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? [
          {
            key: "price",
            label: `₹${minPrice ?? facets.priceMin}–₹${maxPrice ?? facets.priceMax}`,
            href: hrefWith({ minPrice: undefined, maxPrice: undefined }),
          },
        ]
      : []),
    ...(inStock ? [{ key: "inStock", label: "In stock only", href: hrefWith({ inStock: false }) }] : []),
  ];

  // Defined once, rendered twice below (the desktop sidebar and the mobile
  // slide-up drawer) - identical fields, names, and hidden inputs either
  // way, so there is exactly one filter form, never two copies that could
  // drift apart. Every filter here is a real, uncommitted form field
  // (checkbox/slider) - nothing takes effect until "Apply filters", so a
  // visitor can pick several sizes/colors/brands in the mobile drawer
  // without it closing or reloading between each tap.
  const filterPanelContent = (
    <form method="get" action="/shop" className="flex flex-col gap-5">
      {search ? <input type="hidden" name="q" value={search} /> : null}
      {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}

      <FilterSection title="Category">
        <div className="flex flex-col gap-2.5">
          {PRODUCT_CATEGORIES.map((category) => (
            <label key={category} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80">
              <input
                type="checkbox"
                name="category"
                value={category}
                defaultChecked={categories.includes(category)}
                className="h-4 w-4 accent-rose-800"
              />
              {category}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Size">
        <div className="flex flex-wrap gap-2">
          {PRODUCT_SIZES.map((size) => (
            <label key={size} className="relative">
              <input
                type="checkbox"
                name="size"
                value={size}
                defaultChecked={sizes.includes(size)}
                className="peer sr-only"
              />
              <span className={pillLabelClass}>{size}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {facets.colors.length > 0 ? (
        <FilterSection title="Color">
          <div className="flex flex-wrap gap-3">
            {facets.colors.map((color) => (
              <label key={color.name} className="flex flex-col items-center gap-1">
                <span className="relative">
                  <input
                    type="checkbox"
                    name="color"
                    value={color.name}
                    defaultChecked={colors.includes(color.name)}
                    aria-label={color.name}
                    className="peer sr-only"
                  />
                  <span
                    className="block h-8 w-8 rounded-full border border-black/10 ring-offset-2 ring-offset-background transition-shadow peer-checked:ring-2 peer-checked:ring-rose-800 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-500 dark:border-white/20"
                    style={{ backgroundColor: color.hex ?? "#e5e5e5" }}
                  />
                </span>
                <span className="text-[10px] text-muted-foreground">{color.name}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      ) : null}

      <FilterSection title="Price">
        <PriceRangeSlider min={facets.priceMin} max={facets.priceMax} initialMin={minPrice} initialMax={maxPrice} />
      </FilterSection>

      {facets.brands.length > 0 ? (
        <FilterSection title="Brand">
          <div className="flex flex-col gap-2.5">
            {facets.brands.map((brand) => (
              <label key={brand} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  name="brand"
                  value={brand}
                  defaultChecked={brands.includes(brand)}
                  className="h-4 w-4 accent-rose-800"
                />
                {brand}
              </label>
            ))}
          </div>
        </FilterSection>
      ) : null}

      <FilterSection title="Availability">
        <label className="flex items-center gap-2.5 text-sm text-foreground/80">
          <input type="checkbox" name="inStock" value="1" defaultChecked={inStock} className="h-4 w-4 accent-rose-800" />
          In stock only
        </label>
      </FilterSection>

      {/* Side-by-side in the roomy mobile/tablet drawer, stacked full-width
          in the desktop sidebar - that column is a fixed 240px
          (`lg:grid-cols-[240px_1fr]` below), too narrow to fit both
          uppercase, tracked-out labels on one row without the second
          button's text clipping. */}
      <div className="flex flex-row items-stretch gap-3 border-t border-surface-border pt-5 lg:flex-col">
        <Link
          href="/shop"
          className={buttonVariants({ variant: "outline-burgundy", className: "flex-1 lg:w-full lg:flex-none" })}
        >
          Clear all
        </Link>
        <button
          type="submit"
          className={buttonVariants({ variant: "burgundy", className: "flex-1 lg:w-full lg:flex-none" })}
        >
          Apply filters
        </button>
      </div>
    </form>
  );

  const singleCategory = categories.length === 1 ? categories[0] : undefined;

  // "More in {category}" only makes sense once a visitor has narrowed down
  // to exactly one real category and isn't also searching (search results
  // and recommendations must stay visibly different things) - otherwise
  // there's no single, honest category to recommend more of.
  const categoryRecommendations =
    singleCategory && !search
      ? await getRecommendedProductsForCategory(
          singleCategory,
          sortedProducts.map((product) => product.id),
          8
        )
      : [];
  const categoryRecommendationRatings =
    categoryRecommendations.length > 0
      ? await getRatingSummaries(categoryRecommendations.map((product) => product.id))
      : new Map();

  const breadcrumbSchema = buildBreadcrumbSchema(
    singleCategory
      ? [{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }, { name: singleCategory }]
      : [{ name: "Home", path: "/" }, { name: "Shop" }]
  );

  return (
    <div className="flex flex-col">
      <JsonLd data={breadcrumbSchema} />
      {/* Breadcrumb - compact, muted, real routes only. */}
      <div className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-muted-soft uppercase"
          >
            <Link href="/" className="transition-colors hover:text-rose-800">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            {singleCategory ? (
              <>
                <Link href="/shop" className="transition-colors hover:text-rose-800">
                  Shop
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-rose-800">{singleCategory}</span>
              </>
            ) : (
              <span className="text-rose-800">Shop</span>
            )}
          </nav>
        </div>
      </div>

      {/* Compact intro - not a hero. Reaches the product grid quickly. */}
      <div className="border-b border-surface-border bg-background">
        <div className="mx-auto max-w-[820px] px-4 py-8 text-center sm:px-6 sm:py-10 lg:px-8">
          <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-rose-800 uppercase">
            <span className="h-px w-6 bg-blush-line" aria-hidden="true" />
            Explore the collection
            <span className="h-px w-6 bg-blush-line" aria-hidden="true" />
          </span>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            {search ? `Results for "${search}"` : singleCategory ? singleCategory : "Shop women's fashion"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {search
              ? `${totalCount} ${totalCount === 1 ? "piece" : "pieces"} match your search${singleCategory ? ` in ${singleCategory}` : ""}.`
              : singleCategory
                ? `Browsing the ${singleCategory} edit.`
                : "Browse our latest styles, everyday essentials and statement pieces."}
          </p>
        </div>
      </div>

      {/* Category navigation - a fast single-category jump (the same quiet
          text-rail treatment as the homepage's own category rail); the
          sidebar's own Category checkboxes below support selecting several
          categories at once, both writing to the same `category` filter. */}
      <nav aria-label="Shop by category" className="border-b border-surface-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={hrefWith({ categories: [] })} className={cn(railLinkClass, categories.length === 0 && "text-rose-800")}>
              All
              <span className={cn(railUnderlineClass, categories.length === 0 ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
            </Link>
            {PRODUCT_CATEGORIES.map((option) => {
              const isActive = categories.length === 1 && categories[0] === option;
              return (
                <Link key={option} href={hrefWith({ categories: [option] })} className={cn(railLinkClass, isActive && "text-rose-800")}>
                  {option}
                  <span className={cn(railUnderlineClass, isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {/* Toolbar - result count, search, mobile filter trigger, sort.
            Compact, never more than two rows even on the narrowest phones. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              {totalCount} {totalCount === 1 ? "product" : "products"}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form method="get" action="/shop" className="relative sm:w-64">
                {categories.map((category) => (
                  <input key={category} type="hidden" name="category" value={category} />
                ))}
                {minPrice !== undefined ? <input type="hidden" name="minPrice" value={minPrice} /> : null}
                {maxPrice !== undefined ? <input type="hidden" name="maxPrice" value={maxPrice} /> : null}
                {sizes.map((size) => (
                  <input key={size} type="hidden" name="size" value={size} />
                ))}
                {colors.map((color) => (
                  <input key={color} type="hidden" name="color" value={color} />
                ))}
                {brands.map((brand) => (
                  <input key={brand} type="hidden" name="brand" value={brand} />
                ))}
                {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
                {inStock ? <input type="hidden" name="inStock" value="1" /> : null}
                <label className="sr-only" htmlFor="shop-search">
                  Search products
                </label>
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="shop-search"
                  type="search"
                  name="q"
                  defaultValue={search ?? ""}
                  placeholder="Search dresses, tops, collections..."
                  className="w-full rounded-md border border-surface-border bg-surface py-2.5 pr-3 pl-9 text-sm outline-none transition-colors focus:border-rose-500"
                />
              </form>

              <div className="flex items-center gap-2">
                <ShopFilterDrawer activeCount={activeFilterCount}>{filterPanelContent}</ShopFilterDrawer>
                <ShopSortSelect sort={sort} hiddenFields={sortHiddenFields} />
              </div>
            </div>
          </div>

          {/* Active filter chips - every removable filter in one place,
              category and search included, not only what's inside the
              sidebar/drawer. */}
          {activeChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-surface-border py-3">
              {activeChips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 rounded-md border border-blush-line bg-blush px-2.5 py-1 text-xs font-medium text-rose-800 transition-colors hover:border-rose-800/40 hover:bg-blush-line"
                >
                  {chip.label}
                  <CloseIcon className="h-2.5 w-2.5" />
                </Link>
              ))}
              <Link
                href="/shop"
                className="text-xs font-medium text-rose-800 underline underline-offset-4 hover:text-burgundy"
              >
                Clear all
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden h-fit flex-col gap-6 lg:flex">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] text-foreground uppercase">
              <FilterIcon className="h-4 w-4 text-rose-800" />
              Filters
            </h2>
            {filterPanelContent}
          </aside>

          <div>
            {totalCount === 0 ? (
              <div className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-3 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-blush-line bg-blush text-rose-800">
                  <SearchIcon className="h-6 w-6" />
                </span>
                <p className="font-serif text-xl font-semibold text-foreground uppercase">
                  {search ? `No results for "${search}"` : hasAnyFilter ? "No pieces found" : "Nothing here yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Try another search or explore our collections."
                    : hasAnyFilter
                      ? "Try adjusting your filters or explore our latest arrivals."
                      : "Check back soon - new pieces are added every week."}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
                  {search ? (
                    <Link href={hrefWith({ search: undefined })} className={buttonVariants({ variant: "burgundy" })}>
                      Clear search
                    </Link>
                  ) : hasAnyFilter ? (
                    <Link href="/shop" className={buttonVariants({ variant: "burgundy" })}>
                      Clear filters
                    </Link>
                  ) : null}
                  <Link
                    href={hasAnyFilter ? "/#featured" : "/shop"}
                    className={buttonVariants({ variant: hasAnyFilter ? "outline-burgundy" : "burgundy" })}
                  >
                    {hasAnyFilter ? "View New Arrivals" : "Continue shopping"}
                  </Link>
                </div>
              </div>
            ) : (
              <InfiniteProductGrid
                // Forces a clean remount (fresh internal scroll state)
                // whenever the active filters change, instead of an old
                // filter's already-loaded pages lingering after a new
                // search/filter navigation.
                key={nextPagesQueryString}
                initialProducts={productsWithRatings}
                initialHasMore={hasMore}
                queryString={nextPagesQueryString}
              />
            )}
          </div>
        </div>
      </div>

      {/* Contextual to the current category filter, clearly its own
          section below the grid - never mixed into the actual search
          results above. */}
      {categoryRecommendations.length > 0 ? (
        <section className="bg-blush py-12 sm:py-16">
          <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
            <span className="text-[11px] font-medium tracking-[0.2em] text-rose-500 uppercase">Keep exploring</span>
            <h2 className="mt-1 mb-6 font-serif text-xl font-semibold text-foreground sm:text-2xl">
              More in {singleCategory}
            </h2>
            <ProductScroller
              products={categoryRecommendations}
              ratings={categoryRecommendationRatings}
              cardClassName="w-[58%] sm:w-[42%] md:w-[32%] lg:w-[23%]"
              showCardFrame={false}
            />
          </div>
        </section>
      ) : null}

      {/* Its own section, well below the grid/filters/pagination - never
          mixed into the actual search results. */}
      <RecentlyViewedSection />
    </div>
  );
}
