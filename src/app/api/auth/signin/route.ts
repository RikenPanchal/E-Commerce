import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { signinSchema } from "@/lib/validations/auth";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { verifyPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/mappers";
import type { AuthResponse } from "@/types/auth";
import { checkRateLimits, getClientIp, RATE_LIMITS, resetRateLimit, tooManyRequestsResponse } from "@/lib/security/rateLimit";

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

  const parsed = signinSchema.safeParse(body);
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

  const { email, password } = parsed.data;

  // Per IP (one machine trying many accounts) and per email (many machines
  // trying one account) - see RATE_LIMITS for the numbers.
  const limited = await checkRateLimits([
    { rule: RATE_LIMITS.signinIp, identifier: getClientIp(request) },
    { rule: RATE_LIMITS.signinEmail, identifier: email },
  ]);
  if (!limited.allowed) return tooManyRequestsResponse(limited);

  try {
    await connectDB();

    // `password` is `select: false` on the schema, so it must be requested explicitly.
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // A real customer who got it right shouldn't keep counting toward a lockout.
    await resetRateLimit(RATE_LIMITS.signinEmail, email);

    const token = signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json<AuthResponse>(
      { success: true, user: toSafeUser(user) },
      { status: 200 }
    );
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Signin failed:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
