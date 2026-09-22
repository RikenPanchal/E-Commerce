import type { Metadata } from "next";
import Link from "next/link";
import { getActiveCollections } from "@/lib/shop/collections";
import { CollectionCard } from "@/components/shop/CollectionCard";
import { buttonVariants } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Collections",
};

export default async function CollectionsPage() {
  const collections = await getActiveCollections();

  return (
    <div className="flex flex-col">
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
            <span className="text-rose-800">Collections</span>
          </nav>
        </div>
      </div>

      <div className="border-b border-surface-border bg-background">
        <div className="mx-auto max-w-[820px] px-4 py-8 text-center sm:px-6 sm:py-10 lg:px-8">
          <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-rose-800 uppercase">
            <span className="h-px w-6 bg-blush-line" aria-hidden="true" />
            Curated edits
            <span className="h-px w-6 bg-blush-line" aria-hidden="true" />
          </span>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground sm:text-4xl">Collections</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Themed edits, hand-picked from the catalog.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {collections.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center">
            <p className="font-serif text-xl font-semibold text-foreground">No collections yet</p>
            <p className="text-sm text-muted-foreground">Check back soon, or browse the full catalog instead.</p>
            <Link href="/shop" className={buttonVariants({ variant: "burgundy", className: "mt-1" })}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
