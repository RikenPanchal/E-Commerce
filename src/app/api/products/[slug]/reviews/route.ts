import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getPublicProductBySlug } from "@/lib/shop/products";
import { upsertReview } from "@/lib/shop/reviews";
import { reviewSchema } from "@/lib/validations/review";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { ReviewResponse } from "@/types/review";

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
