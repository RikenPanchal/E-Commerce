import { z } from "zod";

/** The only meta-robots combinations an admin can pick - a free-text robots
 *  field could produce an invalid or self-defeating directive (e.g.
 *  `index,nofollow` on a page with real internal links); this fixed set
 *  covers every real case (normal, deliberately hidden-from-search-but-
 *  still-crawled-for-links, and fully hidden) without that risk. */
export const SEO_META_ROBOTS_OPTIONS = ["index,follow", "noindex,follow", "noindex,nofollow"] as const;

export const seoMetaRobotsSchema = z.enum(SEO_META_ROBOTS_OPTIONS).default("index,follow");
