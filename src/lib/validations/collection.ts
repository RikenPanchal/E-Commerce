import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { seoMetaRobotsSchema } from "@/lib/validations/seo";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The edit form always resubmits every field (not a partial patch), so the
// same schema covers both create and update - mirrors `productSchema`'s own
// doc comment for the same reason. Image is validated separately (a file
// upload, handled the same way product media is).
export const collectionSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
  // Optional: left blank, the lib layer derives one from `name` (same
  // fallback `generateUniqueSlug` gives products). Provided, it must
  // already look like a slug - never silently mangled into one, so what an
  // admin sees in the field is exactly what gets saved.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "Slug is too long")
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only")
    .optional()
    .or(z.literal("")),
  productIds: z
    .array(z.string().refine(isValidObjectId, "Invalid product reference"))
    .max(200, "Too many products in one collection")
    .default([])
    .refine((ids) => new Set(ids).size === ids.length, { message: "Duplicate product in collection" }),
  isActive: z.boolean().default(true),
  // Every field below is an optional override - left blank, the collection
  // page derives real metadata from name/description/image instead (see
  // `buildCollectionMetadata`), so SEO never breaks just because these
  // weren't filled in.
  seoTitle: z.string().trim().max(70, "SEO title should be under 70 characters").optional(),
  seoDescription: z.string().trim().max(160, "Meta description should be under 160 characters").optional(),
  seoCanonicalUrl: z.string().trim().max(300, "Canonical URL is too long").optional(),
  seoMetaRobots: seoMetaRobotsSchema,
  seoOgTitle: z.string().trim().max(70, "OG title should be under 70 characters").optional(),
  seoOgDescription: z.string().trim().max(200, "OG description is too long").optional(),
  seoOgImageUrl: z.string().trim().max(500, "OG image URL is too long").optional(),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

function readJsonArray(formData: FormData, key: string): unknown {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Converts the multipart form fields (text side) into a plain object for `collectionSchema`. */
export function collectionFormDataToObject(formData: FormData): Record<string, unknown> {
  const readString = (key: string): string | undefined => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
  };

  return {
    name: readString("name"),
    description: readString("description"),
    slug: readString("slug") ?? "",
    productIds: readJsonArray(formData, "productIds"),
    isActive: formData.get("isActive") === "true",
    seoTitle: readString("seoTitle"),
    seoDescription: readString("seoDescription"),
    seoCanonicalUrl: readString("seoCanonicalUrl"),
    seoMetaRobots: readString("seoMetaRobots") ?? "index,follow",
    seoOgTitle: readString("seoOgTitle"),
    seoOgDescription: readString("seoOgDescription"),
    seoOgImageUrl: readString("seoOgImageUrl"),
  };
}
