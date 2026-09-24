import Link from "next/link";
import { getActiveCollections, getCollectionProducts } from "@/lib/shop/collections";
import { CollectionCard } from "@/components/shop/CollectionCard";
import { Reveal } from "@/components/home/Reveal";
import { ArrowRightIcon } from "@/components/home/icons";

const HOME_COLLECTION_LIMIT = 4;
// Each card tiles at most 4 photos (1 featured + 3 smaller) - no point
// resolving more of a collection's products than that.
const PREVIEW_PRODUCTS_PER_CARD = 4;

/**
 * "Shop by Collection" - real, admin-curated collections (New Season,
 * Trending, Party Wear, whatever an admin actually created and activated),
 * never a hardcoded list. Renders nothing at all when there are no active
 * collections yet, exactly like every other real-data homepage section
 * (`FeaturedProducts`, `TrendingNow`) - never a placeholder or fake entry.
 */
export async function CollectionsSection() {
  const collections = await getActiveCollections(HOME_COLLECTION_LIMIT);

  if (collections.length === 0) {
    return null;
  }

  // One real product-photo mosaic per card (see `CollectionCard`) instead
  // of a single flat banner - resolved here, in parallel, so the section
  // stays a single round trip per collection rather than N+1.
  const productsByCollection = await Promise.all(
    collections.map((collection) => getCollectionProducts(collection).then((products) => products.slice(0, PREVIEW_PRODUCTS_PER_CARD)))
  );

  return (
    <section id="collections" className="scroll-mt-20 bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
        <Reveal className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-rose-400 uppercase">
              Shop by collection
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground sm:text-4xl">Curated Edits</h2>
          </div>
          <Link
            href="/collections"
            className="group hidden shrink-0 items-center gap-1.5 text-sm font-medium text-rose-400 sm:flex"
          >
            View all
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <Reveal delayMs={100} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((collection, index) => (
            <CollectionCard key={collection.id} collection={collection} previewProducts={productsByCollection[index]} />
          ))}
        </Reveal>

        <Link href="/collections" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-rose-400 sm:hidden">
          View all collections
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
