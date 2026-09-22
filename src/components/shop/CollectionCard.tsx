import Link from "next/link";
import { ArrowRightIcon } from "@/components/home/icons";
import type { CollectionView } from "@/types/collection";

/**
 * The same image-with-bottom-scrim treatment `CategoryShowcase`'s
 * `CategoryTile` uses for categories - reused here so a "Shop by
 * Collection" section reads as part of the same visual language rather
 * than a different card style bolted on. Used on the homepage strip and
 * the `/collections` index alike, so both stay visually identical.
 */
export function CollectionCard({ collection, big = false }: { collection: CollectionView; big?: boolean }) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-sand"
    >
      {collection.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collection.image.url}
          alt={collection.image.alt ?? collection.name}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent p-5 pt-16">
        <span className="flex items-center gap-2 transition-transform duration-300 ease-out group-hover:translate-x-1">
          <span className={`font-serif font-semibold text-white ${big ? "text-3xl sm:text-4xl" : "text-lg"}`}>
            {collection.name}
          </span>
          <ArrowRightIcon
            className={`text-white opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 ${big ? "h-6 w-6" : "h-4 w-4"}`}
          />
        </span>
        {collection.description ? (
          <span className={`block text-white/80 ${big ? "mt-1 text-sm" : "text-xs"}`}>{collection.description}</span>
        ) : null}
        <span className="mt-3 inline-block text-xs font-medium tracking-[0.15em] text-white uppercase">
          <span className="border-b border-white/60 pb-0.5">Shop the edit</span>
        </span>
      </div>
    </Link>
  );
}
