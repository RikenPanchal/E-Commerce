import Link from "next/link";
import { getPublicProducts } from "@/lib/shop/products";
import { categoryPreviews, type CategoryPreview } from "@/lib/data/categories";
import { ProductImage } from "@/components/shop/ProductImage";
import { ArrowRightIcon } from "@/components/home/icons";
import { Reveal } from "@/components/home/Reveal";
import type { ProductView } from "@/types/product";

function CategoryTile({
  category,
  product,
  className = "",
  big = false,
}: {
  category: CategoryPreview;
  product?: ProductView;
  className?: string;
  big?: boolean;
}) {
  return (
    <Link href={`/shop?category=${encodeURIComponent(category.name)}`} className={`group relative block overflow-hidden ${className}`}>
      {product ? (
        <ProductImage
          media={product.media}
          name={category.name}
          category={category.name}
          className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="h-full w-full bg-sand" />
      )}
      {/* Text overlaid on a bottom scrim rather than sitting below the
          tile - the bento tiles are different heights, so anchoring the
          label to the image itself keeps every tile's caption in the same
          place regardless of size. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent p-5 pt-16">
        <span className="flex items-center gap-2 transition-transform duration-300 ease-out group-hover:translate-x-1">
          <span className={`font-serif font-semibold text-white ${big ? "text-4xl sm:text-5xl" : "text-lg"}`}>
            {category.name}
          </span>
          {/* Hidden until hover, then fades and slides in alongside the
              name shifting - a small, purposeful detail rather than a
              flashy one. */}
          <ArrowRightIcon
            className={`text-white opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 ${big ? "h-6 w-6" : "h-4 w-4"}`}
          />
        </span>
        <span className={`block text-white/80 ${big ? "mt-1 text-sm" : "text-xs"}`}>{category.description}</span>
        <span className={`mt-3 inline-block text-xs font-medium tracking-[0.15em] text-white uppercase ${big ? "" : "mt-2"}`}>
          <span className="border-b border-white/60 pb-0.5">Explore</span>
        </span>
      </div>
    </Link>
  );
}

// The homepage's one and only category-discovery section (a separate
// "Shop your style" section used to sit above the Hero, showing the same
// categories a second time under a different name - removed rather than
// kept alongside this one). A curated "bento" cluster on larger screens -
// one large tile plus three smaller ones - rather than four identical
// boxes in a row, so this still reads as its own editorial/asymmetric
// section rather than a repeat of the New Arrivals grid further down the
// page.
export async function CategoryShowcase() {
  // One real, representative photo per category - the same
  // `getPublicProducts` call the Shop page's own filtering uses, just
  // scoped to a single category and the newest match, so this section
  // shows genuine catalog photography instead of an initial-letter tile.
  const categoryProducts = await Promise.all(
    categoryPreviews.map(async (category) => {
      const [product] = await getPublicProducts({ category: category.name, limit: 1 });
      return [category.name, product] as const;
    })
  );
  const productByCategory = new Map(categoryProducts);

  const [first, second, third, fourth] = categoryPreviews;

  return (
    <section id="categories" className="scroll-mt-20 bg-cream py-12 sm:py-20">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
        <Reveal className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">Shop by category</h2>
          <p className="mt-2 text-sm text-muted-foreground">Explore styles made for every mood and moment.</p>
        </Reveal>

        {/* Small/medium screens: a plain even grid - the bento cluster below
            depends on fixed row heights that only make sense once there's
            room for it. */}
        <Reveal delayMs={100} className="grid grid-cols-2 gap-3 sm:gap-4 lg:hidden">
          {categoryPreviews.map((category) => (
            <CategoryTile
              key={category.name}
              category={category}
              product={productByCategory.get(category.name)}
              className="aspect-square"
            />
          ))}
        </Reveal>

        <Reveal delayMs={100} className="hidden lg:grid lg:h-[620px] lg:grid-cols-4 lg:grid-rows-2 lg:gap-4">
          <CategoryTile category={first} product={productByCategory.get(first.name)} className="col-span-2 row-span-2" big />
          <CategoryTile category={second} product={productByCategory.get(second.name)} className="col-span-1 row-span-1" />
          <CategoryTile category={third} product={productByCategory.get(third.name)} className="col-span-1 row-span-1" />
          <CategoryTile category={fourth} product={productByCategory.get(fourth.name)} className="col-span-2 row-span-1" />
        </Reveal>
      </div>
    </section>
  );
}
