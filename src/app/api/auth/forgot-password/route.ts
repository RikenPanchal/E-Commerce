import { NextResponse, after } from "next/server";
import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/auth/passwordReset";
import { isEmailConfigured } from "@/lib/email/mailer";
import { sendPasswordResetEmail } from "@/lib/email/passwordResetEmail";
import { SITE_URL } from "@/lib/seo/site";
import type { ForgotPasswordResponse } from "@/types/auth";
import { checkRateLimits, getClientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/security/rateLimit";

const GENERIC_MESSAGE =
  "If an account exists with that email, we've sent password reset instructions.";

export async function POST(request: Request): Promise<NextResponse<ForgotPasswordResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Please fix the highlighted fields",
        fieldErrors: firstFieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  // The per-email limit counts every request for that address, registered or
  // not, so being limited reveals nothing about which emails have accounts.
  const limited = await checkRateLimits([
    { rule: RATE_LIMITS.forgotPasswordIp, identifier: getClientIp(request) },
    { rule: RATE_LIMITS.forgotPasswordEmail, identifier: parsed.data.email },
  ]);
  if (!limited.allowed) return tooManyRequestsResponse(limited);

  try {
    await connectDB();
    const user = await User.findOne({ email: parsed.data.email });

    // Same response whether or not the account exists - otherwise this
    // endpoint could be used to check which emails are registered.
    let devResetUrl: string | undefined;
    if (user) {
      const { rawToken, tokenHash, expiresAt } = generateResetToken();
      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpires = expiresAt;
      await user.save();

      // Built from the configured public site URL, never the request's own
      // Host header - otherwise a forged Host could make the emailed link
      // point at an attacker's domain and leak the token to them. Falls
      // back to the request origin only when NEXT_PUBLIC_SITE_URL isn't set.
      const origin = process.env.NEXT_PUBLIC_SITE_URL ? SITE_URL : new URL(request.url).origin;
      const resetUrl = new URL("/reset-password", origin);
      resetUrl.searchParams.set("token", rawToken);

      if (isEmailConfigured()) {
        const recipient = { to: user.email, name: user.name };
        // Sent after the response goes out: awaiting it here would make
        // this endpoint answer noticeably slower for registered emails than
        // for unknown ones, which would leak which emails have accounts.
        // Failures are logged without the link - the token must never end
        // up in server logs.
        after(async () => {
          try {
            await sendPasswordResetEmail({
              ...recipient,
              resetUrl: resetUrl.toString(),
              expiresInMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
            });
          } catch (error) {
            console.error(`Failed to send password reset email to user ${user._id.toString()}:`, error);
          }
        });
      } else if (process.env.NODE_ENV !== "production") {
        // Local development without email credentials - hand the link back
        // to the form so the flow stays testable. Never in production.
        devResetUrl = resetUrl.toString();
      } else {
        console.error("Password reset requested but EMAIL_USER/EMAIL_PASS are not set - no email was sent.");
      }
    }

    return NextResponse.json(
      { success: true, message: GENERIC_MESSAGE, devResetUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to process forgot-password request:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
