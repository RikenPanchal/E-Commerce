import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { addAddress } from "@/lib/account/addresses";
import { addressSchema } from "@/lib/validations/account";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { AddressResponse } from "@/types/account";

export async function POST(request: Request): Promise<NextResponse<AddressResponse>> {
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

  const parsed = addressSchema.safeParse(body);
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
    const result = await addAddress(currentUser.id, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true, address: result.address }, { status: 201 });
  } catch (error) {
    console.error("Failed to add address:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
