import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelBackInStockSubscriptionByToken } from "@/lib/shop/backInStock";
import type { BackInStockUnsubscribeResponse } from "@/types/backInStock";

const unsubscribeSchema = z.object({ token: z.string().trim().min(1, "Missing token") });

export async function POST(request: Request): Promise<NextResponse<BackInStockUnsubscribeResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "This unsubscribe link is invalid." }, { status: 400 });
  }

  try {
    // Same result whether the token never existed or was already used - an
    // unsubscribe link never confirms which, matching the forgot-password
    // route's own "never reveal account existence" convention.
    await cancelBackInStockSubscriptionByToken(parsed.data.token);
    return NextResponse.json(
      { success: true, message: "You've been unsubscribed from this alert." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to process back-in-stock unsubscribe:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
