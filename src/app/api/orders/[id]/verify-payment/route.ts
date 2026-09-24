import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getOrderDocumentForUser, finalizeOrderPayment, toOrderView } from "@/lib/shop/orders";
import { sendOrderConfirmationEmail } from "@/lib/email/orderConfirmationEmail";
import { verifyPaymentSchema } from "@/lib/validations/order";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { OrderResponse } from "@/types/order";

/**
 * Called by the checkout page right after Razorpay Checkout's own success
 * handler fires (see CheckoutForm) - the one place a payment actually gets
 * marked paid and the confirmation email actually gets sent. Ownership-
 * checked (only the order's own owner can call this) and idempotent (a
 * second call, or a race with the Razorpay webhook reporting the same
 * `payment.captured` event, never double-sends the email or double-credits
 * a coupon).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<OrderResponse>> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Please sign in" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Please fix the highlighted fields", fieldErrors: firstFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const order = await getOrderDocumentForUser(user.id, id);
  if (!order) {
    return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
  }

  if (order.razorpayOrderId !== parsed.data.razorpayOrderId) {
    return NextResponse.json({ success: false, message: "This payment doesn't match this order." }, { status: 400 });
  }

  try {
    const result = await finalizeOrderPayment(order, {
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
    });
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    const orderView = toOrderView(result.order);

    // First confirmation only - a re-verify (or the webhook landing after
    // this call already finalized it) must never send a second email.
    // Best-effort like the old COD confirmation email was: a slow/
    // unconfigured mail provider must never turn an already-paid order
    // into a failed response.
    if (!result.alreadyPaid) {
      try {
        await sendOrderConfirmationEmail(orderView, user.email, user.name);
      } catch (error) {
        console.error(`Failed to send order confirmation email for order ${orderView.id}:`, error);
      }
    }

    return NextResponse.json({ success: true, order: orderView }, { status: 200 });
  } catch (error) {
    console.error("Failed to verify payment:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong verifying your payment. Please contact support." },
      { status: 500 }
    );
  }
}
