import { connectDB } from "@/lib/db/connectDB";
import Collection from "@/models/Collection";
import { toCollectionView } from "@/lib/admin/collections";
import { getPublicProductsByIds } from "@/lib/shop/products";
import type { CollectionView } from "@/types/collection";
import type { ProductView } from "@/types/product";

/** Active collections, newest first - what the homepage strip and the
 *  `/collections` index both list. Never includes an inactive collection:
 *  those exist for an admin to prepare/preview before switching them on. */
export async function getActiveCollections(limit?: number): Promise<CollectionView[]> {
  await connectDB();
  let query = Collection.find({ isActive: true }).sort({ createdAt: -1 });
  if (limit) {
    query = query.limit(limit);
  }
  const collections = await query;
  return collections.map(toCollectionView);
}

/** A collection by slug for the public detail page. `allowInactive` is only
 *  ever passed `true` by the admin "Preview" action (itself gated on an
 *  admin session by the page that calls this) - every other caller sees an
 *  inactive collection exactly as if it didn't exist, the same way an
 *  unpublished product would 404 rather than render. */
export async function getCollectionBySlug(slug: string, allowInactive = false): Promise<CollectionView | null> {
  await connectDB();
  const collection = await Collection.findOne(allowInactive ? { slug } : { slug, isActive: true });
  return collection ? toCollectionView(collection) : null;
}

/** Hydrates a collection's real, currently-purchasable products, in the
 *  exact order the admin arranged them - `getPublicProductsByIds` itself
 *  already drops anything soft-deleted, and a `$in` query never preserves
 *  input order on its own, so this re-sorts the result back to
 *  `collection.productIds`'s sequence rather than whatever order MongoDB
 *  happened to return. */
export async function getCollectionProducts(collection: CollectionView): Promise<ProductView[]> {
  if (collection.productIds.length === 0) return [];
  const products = await getPublicProductsByIds(collection.productIds);
  const byId = new Map(products.map((product) => [product.id, product]));
  return collection.productIds.map((id) => byId.get(id)).filter((product): product is ProductView => Boolean(product));
}
