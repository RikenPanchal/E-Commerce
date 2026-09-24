import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { changePassword } from "@/lib/account/profile";
import { changePasswordSchema } from "@/lib/validations/account";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { PasswordChangeResponse } from "@/types/account";
import { checkRateLimits, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/security/rateLimit";

export async function PATCH(request: Request): Promise<NextResponse<PasswordChangeResponse>> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, message: "Please sign in" }, { status: 401 });
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

  const parsed = changePasswordSchema.safeParse(body);
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

  const limited = await checkRateLimits([{ rule: RATE_LIMITS.changePasswordUser, identifier: currentUser.id }]);
  if (!limited.allowed) return tooManyRequestsResponse(limited);

  try {
    const result = await changePassword(currentUser.id, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "Password updated" }, { status: 200 });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
