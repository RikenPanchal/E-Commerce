import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Collection, { type CollectionDocument } from "@/models/Collection";
import Product from "@/models/Product";
import { saveCollectionImage, deleteCollectionImageFile } from "@/lib/media/storage";
import { slugify } from "@/lib/utils/slugify";
import type { CollectionInput } from "@/lib/validations/collection";
import type { CollectionView } from "@/types/collection";

export function toCollectionView(collection: CollectionDocument): CollectionView {
  return {
    id: collection._id.toString(),
    name: collection.name,
    slug: collection.slug,
    description: collection.description ?? undefined,
    image: collection.image ? { url: collection.image.url, alt: collection.image.alt } : undefined,
    productIds: collection.productIds.map((id) => id.toString()),
    isActive: collection.isActive,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

/** Finds a free slug, appending `-2`, `-3`, ... on collision - same
 *  approach as `generateUniqueSlug` in `lib/admin/products.ts`, kept as its
 *  own copy since collections and products are different collections with
 *  independent slug namespaces (a collection and a product may share a slug
 *  without conflict). */
async function generateUniqueCollectionSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "collection";
  let candidate = root;
  let suffix = 2;

  for (;;) {
    const existing = await Collection.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select("_id");
    if (!existing) {
      return candidate;
    }
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
}

/** Filters a submitted product-id list down to products that still exist
 *  and aren't soft-deleted, preserving the admin's chosen order - the same
 *  "handle deleted products safely" approach `resolveComplementaryProductIds`
 *  uses for Product's own `complementaryProductIds`. A stale reference (a
 *  product deleted after being added to a collection) silently drops out
 *  the next time the collection is saved, rather than erroring the whole save. */
async function resolveCollectionProductIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const existing = await Product.find({ _id: { $in: ids }, isDeleted: false }).select("_id");
  const existingIds = new Set(existing.map((product) => product._id.toString()));
  return ids.filter((id) => existingIds.has(id));
}

export async function getAllCollectionsForAdmin(): Promise<CollectionView[]> {
  await connectDB();
  const collections = await Collection.find().sort({ createdAt: -1 });
  return collections.map(toCollectionView);
}

export async function getCollectionById(id: string): Promise<CollectionView | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();
  const collection = await Collection.findById(id);
  return collection ? toCollectionView(collection) : null;
}

export type CollectionResult = { collection: CollectionDocument } | { error: string; fieldErrors?: Record<string, string> };

export async function createCollection(input: CollectionInput, imageFile?: File): Promise<CollectionResult> {
  await connectDB();

  const slug = input.slug ? input.slug : await generateUniqueCollectionSlug(input.name);
  const slugTaken = await Collection.findOne({ slug }).select("_id");
  if (slugTaken) {
    return { error: "That slug is already in use", fieldErrors: { slug: "That slug is already in use" } };
  }

  const productIds = await resolveCollectionProductIds(input.productIds);
  const _id = new Types.ObjectId();
  const collectionId = _id.toString();

  let image: { url: string } | undefined;
  if (imageFile) {
    image = await saveCollectionImage(collectionId, imageFile);
  }

  try {
    const collection = await Collection.create({
      _id,
      name: input.name,
      description: input.description,
      slug,
      productIds,
      isActive: input.isActive,
      image,
    });
    return { collection };
  } catch (error) {
    if (image) {
      await deleteCollectionImageFile(image.url);
    }
    throw error;
  }
}

export async function updateCollection(
  id: string,
  input: CollectionInput,
  imageFile?: File,
  removeImage?: boolean
): Promise<CollectionResult> {
  if (!isValidObjectId(id)) {
    return { error: "Collection not found" };
  }
  await connectDB();

  const existing = await Collection.findById(id);
  if (!existing) {
    return { error: "Collection not found" };
  }

  const slug = input.slug ? input.slug : await generateUniqueCollectionSlug(input.name, id);
  const slugTaken = await Collection.findOne({ slug, _id: { $ne: id } }).select("_id");
  if (slugTaken) {
    return { error: "That slug is already in use", fieldErrors: { slug: "That slug is already in use" } };
  }

  const productIds = await resolveCollectionProductIds(input.productIds);

  const previousImageUrl = existing.image?.url;
  let image = existing.image;
  if (imageFile) {
    image = await saveCollectionImage(id, imageFile);
  } else if (removeImage) {
    image = undefined;
  }

  const updated = await Collection.findByIdAndUpdate(
    id,
    {
      name: input.name,
      description: input.description ?? null,
      slug,
      productIds,
      isActive: input.isActive,
      image: image ?? null,
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return { error: "Collection not found" };
  }

  // Only clean up the old file once the new state is safely saved, and only
  // when it actually changed (a fresh upload, or an explicit removal).
  if (previousImageUrl && (imageFile || removeImage) && previousImageUrl !== updated.image?.url) {
    await deleteCollectionImageFile(previousImageUrl);
  }

  return { collection: updated };
}

export async function setCollectionActive(id: string, isActive: boolean): Promise<CollectionView | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();
  const updated = await Collection.findByIdAndUpdate(id, { isActive }, { new: true });
  return updated ? toCollectionView(updated) : null;
}

export async function deleteCollection(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) {
    return false;
  }
  await connectDB();
  const deleted = await Collection.findByIdAndDelete(id);
  if (!deleted) {
    return false;
  }
  if (deleted.image?.url) {
    await deleteCollectionImageFile(deleted.image.url);
  }
  return true;
}
