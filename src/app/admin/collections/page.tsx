import type { Metadata } from "next";
import Link from "next/link";
import { getAllCollectionsForAdmin } from "@/lib/admin/collections";
import { CollectionActions } from "@/components/admin/collections/CollectionActions";

export const metadata: Metadata = {
  title: "Collections",
};

export default async function AdminCollectionsPage() {
  const collections = await getAllCollectionsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Collections</h1>
          <p className="text-sm text-foreground/60">
            {collections.length} collection{collections.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/collections/new"
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
        >
          Add collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-2xl border border-black/5 py-16 text-center dark:border-white/10">
          <p className="text-sm text-foreground/60">
            No collections yet.{" "}
            <Link href="/admin/collections/new" className="text-rose-600 underline dark:text-rose-400">
              Create your first one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-black/5 dark:border-white/10"
            >
              <div className="relative aspect-[16/9] w-full bg-black/5 dark:bg-white/10">
                {collection.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={collection.image.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-foreground/40">
                    No image
                  </div>
                )}
                <span
                  className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    collection.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-black/60 text-white"
                  }`}
                >
                  {collection.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div>
                  <h2 className="truncate font-serif text-lg font-semibold text-foreground">{collection.name}</h2>
                  <p className="truncate font-mono text-xs text-foreground/50">/{collection.slug}</p>
                </div>
                {collection.description ? (
                  <p className="line-clamp-2 text-xs text-foreground/60">{collection.description}</p>
                ) : null}
                <p className="text-xs text-foreground/50">
                  {collection.productIds.length} product{collection.productIds.length === 1 ? "" : "s"}
                </p>
                <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/10">
                  <CollectionActions collection={collection} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
