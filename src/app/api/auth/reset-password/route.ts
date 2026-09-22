import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { hashResetToken } from "@/lib/auth/passwordReset";
import { hashPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/mappers";
import type { AuthResponse } from "@/types/auth";

export async function POST(request: Request): Promise<NextResponse<AuthResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = resetPasswordSchema.safeParse(body);
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

    const tokenHash = hashResetToken(parsed.data.token);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpires");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    user.password = await hashPassword(parsed.data.password);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Reset succeeds straight into a signed-in session, same as signup/signin.
    const token = signAuthToken({ userId: user._id.toString(), email: user.email, role: user.role });
    const response = NextResponse.json<AuthResponse>(
      { success: true, user: toSafeUser(user) },
      { status: 200 }
    );
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
