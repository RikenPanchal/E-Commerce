import type { ProductDocument } from "@/models/Product";
import type { ProductView } from "@/types/product";

/** Maps a Mongo product document to the plain shape sent to the client. */
export function toProductView(product: ProductDocument): ProductView {
  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    sku: product.sku,
    stock: product.stock,
    sizes: product.sizes,
    colors: product.colors.map((color) => ({ name: color.name, hex: color.hex })),
    // `variants` is a new field - existing documents saved before it existed
    // have no such key stored at all, and a plain aggregation pipeline
    // result (unlike a normal query) never gets Mongoose's schema default
    // applied to fill it in, so this must tolerate a genuinely missing array.
    variants: (product.variants ?? []).map((variant) => ({
      id: variant._id.toString(),
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      stock: variant.stock,
      isActive: variant.isActive,
    })),
    // Same defensive fallback as `variants` above - a genuinely new field
    // that an aggregation-pipeline result (which skips Mongoose defaults
    // entirely) could hand back as undefined for an older document.
    complementaryProductIds: (product.complementaryProductIds ?? []).map((id) => id.toString()),
    material: product.material,
    brand: product.brand,
    tags: product.tags,
    isFeatured: product.isFeatured,
    media: product.media.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      url: item.url,
      alt: item.alt,
    })),
    seo: product.seo
      ? {
          title: product.seo.title,
          description: product.seo.description,
          keywords: product.seo.keywords ?? [],
          canonicalUrl: product.seo.canonicalUrl,
          metaRobots: product.seo.metaRobots ?? "index,follow",
          ogTitle: product.seo.ogTitle,
          ogDescription: product.seo.ogDescription,
          ogImageUrl: product.seo.ogImageUrl,
          imageAlt: product.seo.imageAlt,
        }
      : undefined,
    isDeleted: product.isDeleted,
    deletedAt: product.deletedAt ? product.deletedAt.toISOString() : undefined,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
