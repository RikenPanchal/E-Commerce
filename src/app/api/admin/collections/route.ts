import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createCollection, getAllCollectionsForAdmin, toCollectionView } from "@/lib/admin/collections";
import { collectionFormDataToObject, collectionSchema } from "@/lib/validations/collection";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { MediaValidationError } from "@/lib/media/storage";
import type { CollectionResponse, CollectionView } from "@/types/collection";

export async function GET(): Promise<NextResponse<{ collections: CollectionView[] }>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ collections: [] }, { status: 403 });
  }

  const collections = await getAllCollectionsForAdmin();
  return NextResponse.json({ collections });
}

export async function POST(request: Request): Promise<NextResponse<CollectionResponse>> {
  // The proxy (src/proxy.ts) already gatekeeps `/api/admin/*`, but this
  // handler re-checks authorization itself rather than trusting it alone.
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be multipart form data" },
      { status: 400 }
    );
  }

  const parsed = collectionSchema.safeParse(collectionFormDataToObject(formData));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Please fix the highlighted fields", fieldErrors: firstFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const imageFile = formData.get("image");
  const image = imageFile instanceof File && imageFile.size > 0 ? imageFile : undefined;

  try {
    const result = await createCollection(parsed.data, image);
    if ("error" in result) {
      return NextResponse.json(
        { success: false, message: result.error, fieldErrors: result.fieldErrors },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, collection: toCollectionView(result.collection) }, { status: 201 });
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error("Failed to create collection:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
