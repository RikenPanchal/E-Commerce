import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connectDB";
import { isDuplicateKeyError } from "@/lib/db/errors";
import RateLimit from "@/models/RateLimit";

export interface RateLimitRule {
  /** Namespaces the counter, e.g. "signin:ip" or "signin:email". */
  name: string;
  /** Max requests allowed within one window. */
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window ends (for a Retry-After header). */
  retryAfterSeconds: number;
}

/**
 * Counts one request against `rule` for `identifier` (an IP, an email...)
 * and says whether it's still within the limit. Fixed window: the first
 * request starts a window of `windowMs`; every request inside it increments
 * the same counter, atomically, so concurrent requests can't slip past.
 *
 * Fails open: if the database call itself errors, the request is allowed
 * (and the error logged) - a rate limiter outage must never lock every
 * customer out of signing in.
 */
export async function consumeRateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  const key = `${rule.name}:${identifier.toLowerCase()}`;
  const now = new Date();

  try {
    await connectDB();
    // Existing, still-open window -> just count this request.
    let doc = await RateLimit.findOneAndUpdate(
      { key, expiresAt: { $gt: now } },
      { $inc: { count: 1 } },
      { new: true }
    );
    if (!doc) {
      // No window yet, or an expired one the TTL monitor hasn't removed ->
      // start a fresh window. Two first-requests racing here both upsert the
      // same unique key; the loser's duplicate-key error is retried once as
      // a plain increment of the winner's new window.
      try {
        doc = await RateLimit.findOneAndUpdate(
          { key, expiresAt: { $lte: now } },
          { $set: { count: 1, expiresAt: new Date(now.getTime() + rule.windowMs) } },
          { new: true, upsert: true }
        );
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        doc = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { new: true });
      }
    }
    if (!doc) return { allowed: true, retryAfterSeconds: 0 };

    const retryAfterSeconds = Math.max(1, Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 1000));
    return { allowed: doc.count <= rule.limit, retryAfterSeconds };
  } catch (error) {
    console.error(`Rate limiter failed for ${rule.name} - allowing the request:`, error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Clears a counter early - e.g. an email's failed-sign-in count once that
 *  account signs in successfully. Best-effort, like the limiter itself. */
export async function resetRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  try {
    await connectDB();
    await RateLimit.deleteOne({ key: `${rule.name}:${identifier.toLowerCase()}` });
  } catch (error) {
    console.error(`Failed to reset rate limit ${rule.name}:`, error);
  }
}

/**
 * The caller's IP. On Vercel, `x-forwarded-for` is set by the platform
 * itself (the client's real IP first), so it can't be spoofed from outside;
 * `x-real-ip` is the fallback some other hosts use. Locally both are usually
 * absent, which groups all local requests under "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Checks several rules at once (e.g. per-IP *and* per-email) - every rule
 *  counts the request, and the most restrictive result wins. */
export async function checkRateLimits(checks: { rule: RateLimitRule; identifier: string }[]): Promise<RateLimitResult> {
  const results = await Promise.all(checks.map((check) => consumeRateLimit(check.rule, check.identifier)));
  const blocked = results.filter((result) => !result.allowed);
  if (blocked.length === 0) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.max(...blocked.map((result) => result.retryAfterSeconds)) };
}

function describeWait(seconds: number): string {
  if (seconds < 60) return "a moment";
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** The standard 429 response - the same `{ success: false, message }` shape
 *  every auth form already displays, plus a Retry-After header. */
export function tooManyRequestsResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      success: false as const,
      message: `Too many attempts. Please try again in ${describeWait(result.retryAfterSeconds)}.`,
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}

const MINUTE = 60 * 1000;

/** Every auth limit in one place, so they're easy to review and tune. */
export const RATE_LIMITS = {
  /** Blunts password guessing from one machine across many accounts. */
  signinIp: { name: "signin:ip", limit: 20, windowMs: 15 * MINUTE },
  /** Blunts guessing one account's password from many machines. Cleared on
   *  a successful sign-in, so a customer who mistypes a few times and then
   *  gets it right doesn't keep counting toward a lockout. */
  signinEmail: { name: "signin:email", limit: 8, windowMs: 15 * MINUTE },
  /** Stops scripted mass account creation. */
  signupIp: { name: "signup:ip", limit: 5, windowMs: 60 * MINUTE },
  /** Stops reset-email spam from one machine... */
  forgotPasswordIp: { name: "forgot:ip", limit: 5, windowMs: 15 * MINUTE },
  /** ...and flooding one person's inbox from many. Counted whether or not
   *  the account exists, so hitting it reveals nothing about which emails
   *  are registered. */
  forgotPasswordEmail: { name: "forgot:email", limit: 3, windowMs: 60 * MINUTE },
  /** Reset tokens are 256-bit random, so this is defense in depth. */
  resetPasswordIp: { name: "reset:ip", limit: 10, windowMs: 15 * MINUTE },
  /** Guessing the current password from a hijacked session. */
  changePasswordUser: { name: "password:user", limit: 10, windowMs: 15 * MINUTE },
} satisfies Record<string, RateLimitRule>;
