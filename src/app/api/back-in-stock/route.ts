import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { subscribeToBackInStock } from "@/lib/shop/backInStock";
import { backInStockSubscribeSchema } from "@/lib/validations/backInStock";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { BackInStockSubscribeResponse } from "@/types/backInStock";

export async function POST(request: Request): Promise<NextResponse<BackInStockSubscribeResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = backInStockSubscribeSchema.safeParse(body);
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
    // A signed-in customer always uses their own account email - a guest's
    // (or anyone's) claimed email in the request body is never trusted for
    // an authenticated request, so one customer can't subscribe an address
    // that isn't theirs.
    const currentUser = await getCurrentUser();
    const result = await subscribeToBackInStock(parsed.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, alreadySubscribed: result.alreadySubscribed }, { status: 200 });
  } catch (error) {
    console.error("Failed to create back-in-stock subscription:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
