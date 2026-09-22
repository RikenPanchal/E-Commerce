import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getPublicOffers } from "@/lib/shop/coupons";
import type { OffersResponse } from "@/types/coupon";

export async function GET(): Promise<NextResponse<OffersResponse>> {
  try {
    const user = await getCurrentUser();
    const offers = await getPublicOffers(user?.id);
    return NextResponse.json({ success: true, offers }, { status: 200 });
  } catch (error) {
    console.error("Failed to load offers:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
