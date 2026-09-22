import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { placeOrder, toOrderView } from "@/lib/shop/orders";
import { sendOrderConfirmationEmail } from "@/lib/email/orderConfirmationEmail";
import { placeOrderSchema } from "@/lib/validations/order";
import { nestedFieldErrors } from "@/lib/validations/formatZodError";
import type { OrderResponse } from "@/types/order";

export async function POST(request: Request): Promise<NextResponse<OrderResponse>> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in to place an order" },
      { status: 401 }
    );
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

  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Please fix the highlighted fields",
        // `shippingAddress` is a nested sub-object of this schema - a bad
        // `shippingAddress.city` needs to surface as `fieldErrors.city` (what
        // the checkout form's fields are actually keyed by), not collapse to
        // the single unbound key `shippingAddress`.
        fieldErrors: nestedFieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const result = await placeOrder(user.id, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 409 });
    }

    const order = toOrderView(result.order);

    // The order is already placed and the stock side of things is done - a
    // slow or unconfigured mail provider must never turn that into a failed
    // order response, so this is awaited (this is a long-lived Node
    // process, not a serverless function that could be frozen mid-request)
    // but its own failure is only ever logged, never rethrown.
    try {
      await sendOrderConfirmationEmail(order, user.email, user.name);
    } catch (error) {
      console.error(`Failed to send order confirmation email for order ${order.id}:`, error);
    }

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error("Failed to place order:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
