import { mkdir, rmdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local-disk media storage under public/uploads/products/<productId>/.
// Fine for a single self-hosted Node server; swap for object storage
// (S3/Cloudinary/etc.) before deploying to a serverless/read-only filesystem
// platform, since writes here won't persist across deploys there.

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "products");

export type MediaKind = "image" | "video";

export interface SavedMedia {
  type: MediaKind;
  url: string;
}

export class MediaValidationError extends Error {}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60MB

function classifyMime(mime: string): MediaKind {
  if (IMAGE_MIME_TYPES.has(mime)) {
    return "image";
  }
  if (VIDEO_MIME_TYPES.has(mime)) {
    return "video";
  }
  throw new MediaValidationError(`Unsupported file type: ${mime || "unknown"}`);
}

/** Validates, then writes an uploaded file to disk, returning its public URL. */
export async function saveProductMedia(productId: string, file: File): Promise<SavedMedia> {
  const type = classifyMime(file.type);
  const maxBytes = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new MediaValidationError(
      `"${file.name || "file"}" is too large - ${type}s must be ${maxMb}MB or smaller`
    );
  }

  const dir = path.join(UPLOAD_ROOT, productId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${MIME_EXTENSIONS[file.type] ?? "bin"}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return { type, url: `/uploads/products/${productId}/${filename}` };
}

/** Deletes a previously saved media file. Missing files are ignored. */
export async function deleteProductMediaFile(url: string): Promise<void> {
  if (!url.startsWith("/uploads/products/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch (error) {
    const isMissing = error instanceof Error && "code" in error && error.code === "ENOENT";
    if (!isMissing) {
      throw error;
    }
  }

  // Tidy up the product's folder if that was its last file. rmdir fails
  // silently (ENOTEMPTY/ENOENT) when other media remains or it's already gone.
  try {
    await rmdir(path.dirname(filePath));
  } catch {
    // Directory not empty or already removed - nothing to do.
  }
}

// A collection carries exactly one hero image (not a gallery), stored under
// its own root so it can never collide with, or be swept up by, product
// media cleanup above.
const COLLECTION_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "collections");

/** Validates, then writes an uploaded collection image to disk, returning its public URL. */
export async function saveCollectionImage(collectionId: string, file: File): Promise<SavedMedia> {
  const type = classifyMime(file.type);
  if (type !== "image") {
    throw new MediaValidationError("A collection image must be a photo, not a video");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const maxMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    throw new MediaValidationError(`"${file.name || "file"}" is too large - images must be ${maxMb}MB or smaller`);
  }

  const dir = path.join(COLLECTION_UPLOAD_ROOT, collectionId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${MIME_EXTENSIONS[file.type] ?? "bin"}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return { type, url: `/uploads/collections/${collectionId}/${filename}` };
}

/** Deletes a previously saved collection image. Missing files are ignored. */
export async function deleteCollectionImageFile(url: string): Promise<void> {
  if (!url.startsWith("/uploads/collections/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch (error) {
    const isMissing = error instanceof Error && "code" in error && error.code === "ENOENT";
    if (!isMissing) {
      throw error;
    }
  }

  try {
    await rmdir(path.dirname(filePath));
  } catch {
    // Directory not empty or already removed - nothing to do.
  }
}
