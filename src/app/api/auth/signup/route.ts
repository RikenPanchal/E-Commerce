import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connectDB";
import { isDuplicateKeyError } from "@/lib/db/errors";
import User from "@/models/User";
import { signupSchema } from "@/lib/validations/auth";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import { hashPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/mappers";
import type { AuthResponse } from "@/types/auth";
import { checkRateLimits, getClientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/security/rateLimit";

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

  const parsed = signupSchema.safeParse(body);
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

  const { name, email, password } = parsed.data;

  const limited = await checkRateLimits([{ rule: RATE_LIMITS.signupIp, identifier: getClientIp(request) }]);
  if (!limited.allowed) return tooManyRequestsResponse(limited);

  try {
    await connectDB();

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json<AuthResponse>(
      { success: true, user: toSafeUser(user) },
      { status: 201 }
    );
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    console.error("Signup failed:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
