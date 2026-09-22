import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo/site";
import type { ProductView } from "@/types/product";
import type { CollectionView } from "@/types/collection";
import type { RatingSummary, ReviewView } from "@/types/review";

/** The brand's own Organization record - real, already-public facts only
 *  (the same support email already shown in the footer), never invented
 *  contact details, ratings, or awards. No `logo` field - the project has
 *  no actual logo image file (the header/footer wordmark is an inline SVG
 *  component, not a static asset with a URL), and a broken image reference
 *  in structured data is worse than omitting an optional field. */
export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

/** Enables Google's sitelinks search box - `target` uses the Shop page's
 *  own real `q` search param (see `SmartSearch`), never an invented
 *  endpoint. */
export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/shop?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path, e.g. `/shop`. Omitted for the current (last) page -
   *  schema.org's own convention for "this is where you are now". */
  path?: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/** Product + Offer, with AggregateRating/Review only included when real
 *  review data exists - never a fabricated rating or review to satisfy
 *  Google's rich-result eligibility. `reviews` is capped by the caller
 *  (a product page's own already-fetched review list), not re-fetched here. */
export function buildProductSchema({
  product,
  rating,
  reviews,
  url,
  imageUrls,
}: {
  product: ProductView;
  rating: RatingSummary;
  reviews: ReviewView[];
  url: string;
  imageUrls: string[];
}) {
  const availability =
    product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(imageUrls.length > 0 ? { image: imageUrls } : {}),
    url,
    category: product.category,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: product.price.toFixed(2),
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            reviewCount: rating.count,
          },
        }
      : {}),
    ...(reviews.length > 0
      ? {
          review: reviews.map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.userName },
            datePublished: review.createdAt,
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
            ...(review.comment ? { reviewBody: review.comment } : {}),
          })),
        }
      : {}),
  };
}

/** A curated edit's own page - `CollectionPage` (schema.org has no
 *  ecommerce-specific "Collection" type) plus a real `ItemList` of the
 *  actual products in it, in the admin's own curated order. */
export function buildCollectionPageSchema({
  collection,
  productUrls,
  url,
}: {
  collection: CollectionView;
  productUrls: { name: string; url: string }[];
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    ...(collection.description ? { description: collection.description } : {}),
    url,
    ...(productUrls.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: productUrls.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              url: item.url,
            })),
          },
        }
      : {}),
  };
}
