import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { isDuplicateKeyError } from "@/lib/db/errors";
import {
  addProductMedia,
  removeProductMedia,
  softDeleteProduct,
  toProductView,
  updateProductFields,
} from "@/lib/admin/products";
import Product from "@/models/Product";
import { productFormDataToObject, productSchema } from "@/lib/validations/product";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { MediaValidationError } from "@/lib/media/storage";
import type { ProductResponse } from "@/types/product";

function readRemoveMediaIds(formData: FormData): string[] {
  const raw = formData.get("removeMediaIds");
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ProductResponse>> {
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

  const parsed = productSchema.safeParse(productFormDataToObject(formData));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Please fix the highlighted fields",
        fieldErrors: firstFieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  const newFiles = formData
    .getAll("media")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const removeMediaIds = readRemoveMediaIds(formData);

  try {
    const updated = await updateProductFields(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    if (removeMediaIds.length > 0) {
      await removeProductMedia(id, removeMediaIds);
    }
    if (newFiles.length > 0) {
      await addProductMedia(id, newFiles);
    }

    const finalProduct = await Product.findById(id);
    if (!finalProduct) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: toProductView(finalProduct) }, { status: 200 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { success: false, message: "A product with this name, SKU, or slug already exists" },
        { status: 409 }
      );
    }
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error("Failed to update product:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ProductResponse>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const product = await softDeleteProduct(id);
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: toProductView(product) }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
