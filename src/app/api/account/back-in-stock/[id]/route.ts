import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { cancelBackInStockSubscriptionForUser } from "@/lib/shop/backInStock";
import type { BackInStockUnsubscribeResponse } from "@/types/backInStock";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<BackInStockUnsubscribeResponse>> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, message: "Please sign in" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const removed = await cancelBackInStockSubscriptionForUser(currentUser.id, id);
    if (!removed) {
      return NextResponse.json({ success: false, message: "This alert could not be found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Alert removed." }, { status: 200 });
  } catch (error) {
    console.error("Failed to remove back-in-stock alert:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
