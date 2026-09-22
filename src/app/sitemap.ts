import type { MetadataRoute } from "next";
import { getAllProductSlugsForSitemap } from "@/lib/shop/products";
import { getAllActiveCollectionSlugsForSitemap } from "@/lib/shop/collections";
import { SITE_URL } from "@/lib/seo/site";

/** Every real, currently-public URL: the static content pages, then every
 *  non-deleted product and active collection pulled live from the database
 *  - never a hardcoded product/category list, and never a private/account/
 *  admin/cart/checkout URL (see `robots.ts` for why those are excluded
 *  from crawling in the first place). Rebuilt on each request rather than
 *  cached at build time, so a newly-published product appears without a
 *  redeploy. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([
    getAllProductSlugsForSitemap(),
    getAllActiveCollectionSlugsForSitemap(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/collections`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/shipping`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/returns`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collectionPages: MetadataRoute.Sitemap = collections.map((collection) => ({
    url: `${SITE_URL}/collections/${collection.slug}`,
    lastModified: collection.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...collectionPages];
}
