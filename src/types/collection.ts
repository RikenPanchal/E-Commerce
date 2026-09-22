export interface CollectionImageView {
  url: string;
  alt?: string;
}

/** Collection shape sent to the client - Mongo internals mapped to plain values. */
export interface CollectionView {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: CollectionImageView;
  /** Real Product ids, in display order. Hydrate with `getPublicProductsByIds`
   *  (storefront) or `getProductViewsByIds` (admin) to render them - this
   *  view alone never carries embedded product data. */
  productIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionSuccessResponse {
  success: true;
  collection: CollectionView;
}

export interface CollectionErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type CollectionResponse = CollectionSuccessResponse | CollectionErrorResponse;
