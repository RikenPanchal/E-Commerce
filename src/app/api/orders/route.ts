import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { placeOrder, toOrderView } from "@/lib/shop/orders";
import { placeOrderSchema } from "@/lib/validations/order";
import { nestedFieldErrors } from "@/lib/validations/formatZodError";
import type { PlaceOrderResponse } from "@/types/order";

export async function POST(request: Request): Promise<NextResponse<PlaceOrderResponse>> {
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
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      // Stock is already reserved and a real Razorpay order exists at this
      // point - this is a misconfiguration (env var missing), not a normal
      // failure path, but the customer still can't pay without it, so this
      // is surfaced as an error rather than silently proceeding.
      console.error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not set - cannot open Razorpay Checkout.");
      return NextResponse.json(
        { success: false, message: "Payments aren't configured yet. Please try again later." },
        { status: 500 }
      );
    }

    // The confirmation email is sent once payment is verified
    // (src/app/api/orders/[id]/verify-payment/route.ts), not here - this
    // order isn't paid for yet.
    return NextResponse.json(
      {
        success: true,
        order,
        razorpay: {
          keyId,
          orderId: result.razorpayOrder.id,
          amount: result.razorpayOrder.amount,
          currency: result.razorpayOrder.currency,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to place order:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
