import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connectDB";
import Order from "@/models/Order";
import { failOrderPayment } from "@/lib/shop/orders";

// How long a checkout is allowed to sit unpaid before its stock is
// released back to the catalog - long enough that a customer mid-UPI-app
// hop or filling in card details isn't cut off, short enough that a truly
// abandoned checkout doesn't hold real stock hostage indefinitely.
const PENDING_ORDER_TIMEOUT_MINUTES = 60;

/**
 * Safety net for the one gap `failOrderPayment` itself can't close: a
 * customer who opens Razorpay Checkout and then closes the tab entirely
 * (no dismiss handler, no payment attempt, so no webhook event either) -
 * covered nowhere else, on purpose, since that order is only "possibly
 * abandoned," not the same reliably-abandoned close Checkout itself
 * already reports.
 *
 * Scheduled by vercel.json once a day (03:00 UTC) - the most often Vercel's
 * Hobby plan allows; a more frequent schedule makes every deployment fail.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
 * CRON_SECRET is set in the project's env vars. To release abandoned
 * checkouts sooner, upgrade to Pro (e.g. "*\/30 * * * *") or call this route
 * from an external scheduler with the same header.
 */
async function expirePendingOrders(): Promise<{ expiredCount: number }> {
  await connectDB();

  const cutoff = new Date(Date.now() - PENDING_ORDER_TIMEOUT_MINUTES * 60 * 1000);
  const stale = await Order.find({ paymentStatus: "pending", createdAt: { $lt: cutoff } });

  for (const order of stale) {
    await failOrderPayment(order);
  }

  return { expiredCount: stale.length };
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Not configured - refuse rather than silently running unauthenticated
    // in production. Set CRON_SECRET (see .env.example) to enable this route.
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await expirePendingOrders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to expire pending orders:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
