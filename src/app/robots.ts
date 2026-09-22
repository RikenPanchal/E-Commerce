import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/** Every route that must never be crawled: the admin panel and its APIs
 *  (already access-gated by `proxy.ts`, but disallowed here too so a
 *  crawler never even requests them), every account/cart/checkout page
 *  (real customer session state, not content), and the auth flow (utility
 *  forms, not indexable pages). Query-string noise on `/shop` (sort,
 *  filters, pagination, search) is handled per-page via `noindex` +
 *  canonical instead of here, since robots.txt can't express "index the
 *  base path but not its filtered variants" precisely. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/cart",
          "/checkout",
          "/account",
          "/wishlist",
          "/orders",
          "/orders/",
          "/signin",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/unsubscribe/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
