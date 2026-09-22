import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionById } from "@/lib/admin/collections";
import { getPublicProductsByIds } from "@/lib/shop/products";
import { CollectionForm } from "@/components/admin/collections/CollectionForm";

export const metadata: Metadata = {
  title: "Edit collection",
};

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollectionById(id);

  if (!collection) {
    notFound();
  }

  // Resolved here (one server-side call) so the product picker can show
  // real names/prices/thumbnails for the already-assigned products without
  // the form needing its own fetch just to label chips it already has ids
  // for - mirrors how the product edit page resolves `complementaryProducts`.
  // A product deleted since being added silently drops out here, the same
  // "handle deleted products safely" behavior `getPublicProductsByIds`
  // already gives every other caller.
  const initialProducts =
    collection.productIds.length > 0 ? await getPublicProductsByIds(collection.productIds) : [];
  // Re-sort back to the collection's own saved order - `$in` doesn't
  // preserve it.
  const byId = new Map(initialProducts.map((product) => [product.id, product]));
  const orderedInitialProducts = collection.productIds
    .map((productId) => byId.get(productId))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit collection</h1>
        <p className="text-sm text-foreground/60">{collection.name}</p>
      </div>
      <CollectionForm collection={collection} initialProducts={orderedInitialProducts} />
    </div>
  );
}
