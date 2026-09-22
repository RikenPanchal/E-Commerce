import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { deleteCollection, toCollectionView, updateCollection } from "@/lib/admin/collections";
import { collectionFormDataToObject, collectionSchema } from "@/lib/validations/collection";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { MediaValidationError } from "@/lib/media/storage";
import type { CollectionResponse } from "@/types/collection";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CollectionResponse>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

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
  const removeImage = formData.get("removeImage") === "true";

  try {
    const result = await updateCollection(id, parsed.data, image, removeImage);
    if ("error" in result) {
      const status = result.error === "Collection not found" ? 404 : 409;
      return NextResponse.json(
        { success: false, message: result.error, fieldErrors: result.fieldErrors },
        { status }
      );
    }
    return NextResponse.json({ success: true, collection: toCollectionView(result.collection) }, { status: 200 });
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error("Failed to update collection:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean; message?: string }>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteCollection(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
