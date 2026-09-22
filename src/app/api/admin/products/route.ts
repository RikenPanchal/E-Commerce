import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { isDuplicateKeyError } from "@/lib/db/errors";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  createProduct,
  getPagedActiveProducts,
  parseAdminProductFilters,
  toProductView,
  type PagedAdminProductsResult,
} from "@/lib/admin/products";
import { productFormDataToObject, productSchema } from "@/lib/validations/product";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { MediaValidationError } from "@/lib/media/storage";
import type { ProductResponse } from "@/types/product";

/** Backs the admin product list's infinite scroll - one page of products
 *  matching the same search/category/stock filters the page itself
 *  understands. Page 0 is server-rendered directly by the page; this is
 *  what every later page is fetched from. */
export async function GET(request: Request): Promise<NextResponse<PagedAdminProductsResult>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ products: [], hasMore: false }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters = parseAdminProductFilters(url.searchParams);
  const rawPage = Number(url.searchParams.get("page") ?? "0");
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;

  const result = await getPagedActiveProducts(filters, page, ADMIN_PRODUCTS_PAGE_SIZE);
  return NextResponse.json(result);
}

export async function POST(request: Request): Promise<NextResponse<ProductResponse>> {
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

  const files = formData.getAll("media").filter((item): item is File => item instanceof File && item.size > 0);

  try {
    const product = await createProduct(parsed.data, files);
    return NextResponse.json({ success: true, product: toProductView(product) }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { success: false, message: "A product with this name or SKU already exists" },
        { status: 409 }
      );
    }
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error("Failed to create product:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
