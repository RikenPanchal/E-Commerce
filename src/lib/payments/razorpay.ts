import Razorpay from "razorpay";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

// Server-only Razorpay client + the two signature checks every payment
// must pass through. Never imported from a "use client" component - the
// key secret and webhook secret must never reach the browser bundle.

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable. Define it in your .env.local file.`);
  }
  return value;
}

let cachedClient: Razorpay | null = null;

/** Lazily constructed (not at module load) so importing this file never
 *  throws just because the env vars aren't set yet in an environment that
 *  doesn't need it (e.g. a build step) - only actually creating/verifying a
 *  payment does. */
function getRazorpayClient(): Razorpay {
  if (!cachedClient) {
    cachedClient = new Razorpay({
      key_id: requiredEnv("RAZORPAY_KEY_ID"),
      key_secret: requiredEnv("RAZORPAY_KEY_SECRET"),
    });
  }
  return cachedClient;
}

export interface CreatedRazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Creates the Razorpay-side order a checkout will be paid against.
 *  `amountInRupees` is converted to paise (Razorpay's base unit) here -
 *  every caller works in real rupee amounts, same as the rest of this
 *  codebase (`Order.total`, `formatCurrency`, etc.). */
export async function createRazorpayOrder({
  amountInRupees,
  receipt,
  notes,
}: {
  amountInRupees: number;
  /** Our own order id, for cross-referencing in the Razorpay dashboard. */
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreatedRazorpayOrder> {
  const client = getRazorpayClient();
  // `payment_capture` isn't in this SDK version's TypeScript types (the
  // REST API itself still documents and accepts it), so it's added via a
  // narrow local type rather than casting the whole params object to `any`.
  const order = await client.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: "INR",
    receipt,
    notes,
    payment_capture: 1,
  } as Parameters<typeof client.orders.create>[0] & { payment_capture: 1 });

  return { id: order.id, amount: Number(order.amount), currency: order.currency };
}

/** Verifies a payment success callback's signature - the one thing that
 *  actually proves a `razorpay_payment_id` genuinely paid for a specific
 *  `razorpay_order_id` and wasn't just made up by a malicious client.
 *  Algorithm (Razorpay's own): HMAC-SHA256(order_id + "|" + payment_id,
 *  key_secret) must equal the signature Checkout handed back. */
export function verifyPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  return validatePaymentVerification(
    { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
    razorpaySignature,
    keySecret
  );
}

/** Verifies a Razorpay webhook request - HMAC-SHA256 over the *raw* request
 *  body (never the re-serialized parsed JSON, which can byte-for-byte
 *  differ from what was actually sent and signed) using the separate
 *  webhook secret configured in the Razorpay Dashboard. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = requiredEnv("RAZORPAY_WEBHOOK_SECRET");
  return Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
}
