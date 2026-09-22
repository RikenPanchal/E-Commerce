import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createCoupon, toCouponView } from "@/lib/admin/coupons";
import { couponSchema } from "@/lib/validations/coupon";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { CouponResponse } from "@/types/coupon";

export async function POST(request: Request): Promise<NextResponse<CouponResponse>> {
  // The proxy (src/proxy.ts) already gatekeeps `/api/admin/*`, but this
  // handler re-checks authorization itself rather than trusting it alone.
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
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

  const parsed = couponSchema.safeParse(body);
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
    const result = await createCoupon(parsed.data);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, coupon: toCouponView(result.coupon) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create coupon:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
