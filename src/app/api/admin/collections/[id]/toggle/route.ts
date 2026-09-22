import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { setCollectionActive } from "@/lib/admin/collections";
import type { CollectionResponse } from "@/types/collection";

/** A lightweight, single-field flip for the list page's Activate/Deactivate
 *  action - doesn't require resubmitting the whole collection (name, image,
 *  product order) the way the full edit form's PATCH does. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CollectionResponse>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Request body must be JSON" }, { status: 400 });
  }

  const isActive = typeof body === "object" && body !== null && "isActive" in body ? (body as { isActive: unknown }).isActive : undefined;
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ success: false, message: "isActive must be a boolean" }, { status: 400 });
  }

  const updated = await setCollectionActive(id, isActive);
  if (!updated) {
    return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, collection: updated });
}
