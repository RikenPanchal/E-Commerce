import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { generateResetToken } from "@/lib/auth/passwordReset";
import type { ForgotPasswordResponse } from "@/types/auth";

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

      const resetUrl = new URL("/reset-password", request.url);
      resetUrl.searchParams.set("token", rawToken);

      // No email provider is configured yet - log the link so the flow is
      // testable. Wire up a real provider (Resend, SES, etc.) before
      // production, and remove the devResetUrl field below once it's live.
      console.log(`Password reset link for ${user.email}: ${resetUrl.toString()}`);
      if (process.env.NODE_ENV !== "production") {
        devResetUrl = resetUrl.toString();
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
