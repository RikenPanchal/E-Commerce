import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import {
  getOrderDocumentByRazorpayOrderId,
  finalizeOrderPayment,
  failOrderPayment,
  toOrderView,
} from "@/lib/shop/orders";
import { sendOrderConfirmationEmail } from "@/lib/email/orderConfirmationEmail";
import User from "@/models/User";
import { connectDB } from "@/lib/db/connectDB";

/**
 * The reliable fallback for finalizing/failing a payment - covers exactly
 * what CheckoutForm's own client-side calls can't: the browser tab closing
 * right after a successful payment (before the success handler's fetch
 * completes), a network drop, or Razorpay reporting a failure the client
 * never saw. Configure this URL in Razorpay Dashboard -> Settings ->
 * Webhooks, subscribed to at least `payment.captured` and `payment.failed`.
 *
 * Every code path here is idempotent (`finalizeOrderPayment`/
 * `failOrderPayment` both are) - this webhook and the client's own verify/
 * cancel calls routinely race to report the same event, and that's fine by
 * design rather than something this handler needs to prevent.
 */

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  // The signature is computed over the exact raw bytes Razorpay sent - it
  // must be read as text before any JSON parsing, not `request.json()`
  // (which would let a re-serialized body silently differ byte-for-byte
  // from what was actually signed).
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let isValid: boolean;
  try {
    isValid = verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    console.error("Razorpay webhook signature check failed to run:", error);
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id;
  const razorpayPaymentId = payment?.id;

  // Events this store doesn't act on (refunds, disputes, etc. aren't wired
  // up yet) - acknowledged with 200 either way, since returning an error
  // would make Razorpay keep retrying a webhook this app was never going
  // to do anything with.
  if (!razorpayOrderId || (event.event !== "payment.captured" && event.event !== "payment.failed")) {
    return NextResponse.json({ received: true });
  }

  try {
    const order = await getOrderDocumentByRazorpayOrderId(razorpayOrderId);
    if (!order) {
      // A Razorpay order with no matching local order - most likely
      // `placeOrder` failed to save its own document after already
      // creating the Razorpay order (see the rollback path there).
      // Nothing to update; acknowledge so Razorpay stops retrying.
      return NextResponse.json({ received: true });
    }

    if (event.event === "payment.captured" && razorpayPaymentId) {
      const result = await finalizeOrderPayment(order, {
        razorpayPaymentId,
        // The webhook's own payload doesn't carry a per-payment signature
        // the way Checkout's success handler does - trust here comes from
        // the *webhook request itself* already being signature-verified
        // above, so the payment id is used to mark the order paid directly
        // rather than re-running the order/payment-id HMAC check.
        skipSignatureCheck: true,
      });
      if ("error" in result) {
        console.error(`Webhook: failed to finalize order ${order._id.toString()}:`, result.error);
        return NextResponse.json({ received: true });
      }
      if (!result.alreadyPaid) {
        await connectDB();
        const user = await User.findById(order.user).select("name email");
        if (user) {
          try {
            await sendOrderConfirmationEmail(toOrderView(result.order), user.email, user.name);
          } catch (error) {
            console.error(`Webhook: failed to send confirmation email for order ${order._id.toString()}:`, error);
          }
        }
      }
    } else if (event.event === "payment.failed") {
      await failOrderPayment(order);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process Razorpay webhook:", error);
    // A real error (DB down, etc.) - respond 500 so Razorpay retries later,
    // unlike the "nothing to do" cases above which return 200.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
