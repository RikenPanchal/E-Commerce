import Link from "next/link";
import { ArrowRightIcon } from "@/components/home/icons";
import type { CollectionView } from "@/types/collection";
import type { ProductView } from "@/types/product";

interface PreviewImage {
  url: string;
  alt: string;
}

/** Up to 4 real product photos to tile, in the collection's own order -
 *  never a stock/invented image. Deliberately ignores the admin's own
 *  collection banner image here (that still appears as the hero on the
 *  collection's own detail page) - this card is a product grid, so it
 *  always reflects the collection's actual current merchandise, the same
 *  way a stale/wrong banner photo can never make it look out of date. */
function buildPreviewImages(products: ProductView[]): PreviewImage[] {
  const images: PreviewImage[] = [];
  for (const product of products) {
    if (images.length >= 4) break;
    const photo = product.media.find((item) => item.type === "image");
    if (photo) images.push({ url: photo.url, alt: product.name });
  }
  return images;
}

/** One large tile plus up to three stacked smaller ones - the same
 *  asymmetric "bento" composition `CategoryShowcase` already established
 *  for categories, reused here so a collection reads as a real curated
 *  mosaic of its own products rather than one flat banner (which also
 *  means a collection with a missing/wrong hero photo still looks great,
 *  since the rest of the tiles are real product photography). */
function PreviewMosaic({ images }: { images: PreviewImage[] }) {
  if (images.length === 0) {
    return <div className="aspect-square w-full bg-sand" />;
  }
  if (images.length === 1) {
    return (
      <div className="aspect-square w-full overflow-hidden">
        <Tile image={images[0]} className="h-full w-full" />
      </div>
    );
  }
  if (images.length === 2) {
    return (
      <div className="grid aspect-square w-full grid-cols-2 gap-0.5">
        <Tile image={images[0]} />
        <Tile image={images[1]} />
      </div>
    );
  }
  const rest = images.slice(1);
  return (
    <div className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-0.5">
      <Tile image={images[0]} className="row-span-2" />
      {rest.map((image) => (
        <Tile key={image.url} image={image} />
      ))}
    </div>
  );
}

function Tile({ image, className = "" }: { image: PreviewImage; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.url} alt={image.alt} className={`h-full w-full object-cover ${className}`} />
  );
}

export function CollectionCard({
  collection,
  previewProducts = [],
}: {
  collection: CollectionView;
  /** Real products from this collection, in its own order - resolved
   *  server-side by the caller (`getCollectionProducts`) so this component
   *  stays a plain, data-in presentational card. */
  previewProducts?: ProductView[];
}) {
  const images = buildPreviewImages(previewProducts);

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group block overflow-hidden rounded-2xl border border-surface-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-out group-hover:[&_img]:scale-105">
        <PreviewMosaic images={images} />
      </div>
      <div className="flex flex-col gap-1 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-serif text-xl font-semibold text-foreground">{collection.name}</span>
          <ArrowRightIcon className="h-4 w-4 shrink-0 text-rose-400 transition-transform duration-300 ease-out group-hover:translate-x-1" />
        </div>
        {collection.description ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">{collection.description}</p>
        ) : null}
        <span className="mt-2 w-fit border-b border-rose-400/50 pb-0.5 text-xs font-medium tracking-[0.15em] text-rose-400 uppercase">
          Shop the edit
        </span>
      </div>
    </Link>
  );
}
