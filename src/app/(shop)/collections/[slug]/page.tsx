import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCollectionBySlug, getCollectionProducts } from "@/lib/shop/collections";
import { getRatingSummaries } from "@/lib/shop/reviews";
import { ProductCard } from "@/components/shop/ProductCard";
import { buttonVariants } from "@/components/ui/Button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug, true);
  return { title: collection?.name ?? "Collection" };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // An admin may open an inactive collection to preview it before switching
  // it on (the "Preview" action on the edit page links straight here); every
  // other visitor sees an inactive collection exactly as if it didn't exist.
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const collection = await getCollectionBySlug(slug, isAdmin);

  if (!collection) {
    notFound();
  }

  const products = await getCollectionProducts(collection);
  const ratings = products.length > 0 ? await getRatingSummaries(products.map((product) => product.id)) : new Map();

  return (
    <div className="flex flex-col">
      {!collection.isActive ? (
        <div className="bg-foreground py-2 text-center text-xs font-medium text-white">
          Inactive - only visible to admins as a preview
        </div>
      ) : null}

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
            <Link href="/collections" className="transition-colors hover:text-rose-800">
              Collections
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-rose-800">{collection.name}</span>
          </nav>
        </div>
      </div>

      {/* Banner - the collection's own image behind its name/description,
          the same editorial tone as the Shop page's intro but with real
          collection photography instead of a plain text-only strip. */}
      <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden bg-sand py-14 text-center sm:py-20">
        {collection.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.image.url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {collection.image ? <div className="absolute inset-0 bg-black/40" aria-hidden="true" /> : null}
        <div className="relative mx-auto max-w-[820px] px-4 sm:px-6">
          <h1
            className={`font-serif text-3xl font-semibold sm:text-4xl ${
              collection.image ? "text-white" : "text-foreground"
            }`}
          >
            {collection.name}
          </h1>
          {collection.description ? (
            <p className={`mt-2 text-sm sm:text-base ${collection.image ? "text-white/85" : "text-muted-foreground"}`}>
              {collection.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center">
            <p className="font-serif text-xl font-semibold text-foreground">No products in this collection yet</p>
            <p className="text-sm text-muted-foreground">Check back soon, or browse the full catalog instead.</p>
            <Link href="/shop" className={buttonVariants({ variant: "burgundy", className: "mt-1" })}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} rating={ratings.get(product.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
