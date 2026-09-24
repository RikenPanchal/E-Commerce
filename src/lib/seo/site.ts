// Single source of truth for the site's own public origin - every canonical
// URL, Open Graph/Twitter image URL, sitemap entry, and JSON-LD `url` field
// is built from this, so there is exactly one place to point at the real
// production domain (via NEXT_PUBLIC_SITE_URL) rather than a hardcoded
// domain scattered across metadata exports. Falls back to localhost so
// development/build never breaks when the env var isn't set yet.
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** No trailing slash - every caller appends its own leading `/`. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

export const SITE_NAME = "E-Commerce";

/** Customer-facing contact addresses - used by the footer, the Returns,
 *  Terms and Privacy pages, so there's one place to change them.
 *  PLACEHOLDERS: replace with real, monitored mailboxes before launch. */
export const SUPPORT_EMAIL = "support@e-commerce.example";
export const PRIVACY_EMAIL = "privacy@e-commerce.example";

export const SITE_DESCRIPTION =
  "Curated women's fashion - dresses, tops, ethnic wear and accessories, thoughtfully designed for every occasion. Free shipping across India.";

/** Builds an absolute URL from a site-relative path. Product/collection
 *  media URLs are frequently already-absolute external CDN URLs (e.g. the
 *  Unsplash placeholders seeded into this catalog) - passed through
 *  unchanged rather than double-prefixed, which would otherwise produce a
 *  broken URL like `${SITE_URL}/https://...` in metadata/JSON-LD. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
