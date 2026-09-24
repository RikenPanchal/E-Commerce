import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getOrderDocumentForUser, failOrderPayment, toOrderView } from "@/lib/shop/orders";
import type { OrderResponse } from "@/types/order";

/**
 * Called when Razorpay Checkout's modal is dismissed without paying, or
 * reports an explicit payment failure (see CheckoutForm's `ondismiss`/
 * `payment.failed` handlers) - releases the order's reserved stock so it
 * isn't held hostage by an abandoned checkout. Ownership-checked and
 * idempotent, same as verify-payment; a paid order is never touched by this
 * even if it's called after the fact (e.g. a slow network race).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<OrderResponse>> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Please sign in" }, { status: 401 });
  }

  const { id } = await params;

  const order = await getOrderDocumentForUser(user.id, id);
  if (!order) {
    return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
  }

  try {
    const result = await failOrderPayment(order);
    return NextResponse.json({ success: true, order: toOrderView(result.order) }, { status: 200 });
  } catch (error) {
    console.error("Failed to cancel unpaid order:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
