import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { evaluateCoupon } from "@/lib/shop/coupons";
import { applyCouponSchema } from "@/lib/validations/coupon";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { ApplyCouponResponse } from "@/types/coupon";

export async function POST(request: Request): Promise<NextResponse<ApplyCouponResponse>> {
  // Browsing/cart is guest-friendly (see the checkout page's own comment on
  // this), so previewing a coupon must be too - a guest just won't get the
  // per-account "already used" check until they sign in at checkout, where
  // this same function runs again with their real user id.
  const user = await getCurrentUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = applyCouponSchema.safeParse(body);
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

  const result = await evaluateCoupon(parsed.data.code, parsed.data.items, user?.id);
  if ("error" in result) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, coupon: result.coupon }, { status: 200 });
}
