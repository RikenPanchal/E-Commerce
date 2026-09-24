import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getPublicProductBySlug } from "@/lib/shop/products";
import { getProductReviewsPage, REVIEWS_PAGE_SIZE, upsertReview } from "@/lib/shop/reviews";
import { reviewSchema } from "@/lib/validations/review";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { REVIEW_SORTS, type ReviewPageResponse, type ReviewResponse } from "@/types/review";

const reviewPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(REVIEWS_PAGE_SIZE),
  sort: z.enum(REVIEW_SORTS).default("newest"),
});

/** One page of a product's reviews - public, read-only. Used by the product
 *  page's review pager (PaginatedReviews) after its server-rendered first page. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ReviewPageResponse>> {
  const { slug } = await params;
  const searchParams = new URL(request.url).searchParams;
  const parsed = reviewPageQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid page or sort" }, { status: 400 });
  }

  try {
    const product = await getPublicProductBySlug(slug);
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }
    const page = await getProductReviewsPage(product.id, parsed.data);
    return NextResponse.json({ success: true, ...page });
  } catch (error) {
    console.error("Failed to load reviews:", error);
    return NextResponse.json({ success: false, message: "Couldn't load reviews. Please try again." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ReviewResponse>> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in to leave a review" },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = reviewSchema.safeParse(body);
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

  try {
    const result = await upsertReview(user.id, user.name, product.id, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 403 });
    }
    return NextResponse.json({ success: true, review: result.review }, { status: 200 });
  } catch (error) {
    console.error("Failed to save review:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
