import { Schema, model, models, type Model, type HydratedDocument, type Types } from "mongoose";

export interface CollectionImage {
  url: string;
  alt?: string;
}

export interface CollectionAttributes {
  name: string;
  slug: string;
  description?: string;
  image?: CollectionImage;
  /** Real Product `_id`s only, in display/storefront order - reordering a
   *  collection means rewriting this array, never a separate "position"
   *  field per product. Existence and soft-delete are checked at the lib
   *  layer (`resolveCollectionProductIds`), the same way `Product`'s own
   *  `complementaryProductIds` are, since a path validator can't do a
   *  database round trip. */
  productIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CollectionDocument = HydratedDocument<CollectionAttributes>;

const collectionImageSchema = new Schema<CollectionImage>(
  {
    url: { type: String, required: true },
    alt: { type: String, trim: true },
  },
  { _id: false }
);

const collectionSchema = new Schema<CollectionAttributes>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be at most 80 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },
    image: { type: collectionImageSchema },
    // Database-level guard against duplicate references, mirroring
    // `Product.complementaryProductIds` - the admin API already validates
    // this with Zod, but a path-level validator also covers
    // findByIdAndUpdate (with runValidators: true), which is how the admin
    // save path writes edits.
    productIds: {
      type: [Schema.Types.ObjectId],
      ref: "Product",
      default: [],
      validate: {
        validator: (ids: Types.ObjectId[]) => {
          const seen = new Set<string>();
          for (const id of ids) {
            const key = id.toString();
            if (seen.has(key)) return false;
            seen.add(key);
          }
          return true;
        },
        message: "A collection can't list the same product twice",
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

collectionSchema.index({ isActive: 1, createdAt: -1 });

const Collection: Model<CollectionAttributes> =
  (models.Collection as Model<CollectionAttributes>) ||
  model<CollectionAttributes>("Collection", collectionSchema);

export default Collection;
