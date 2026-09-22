import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { toSafeUser } from "@/lib/auth/mappers";
import { updateRoleSchema } from "@/lib/validations/admin";
import type { AuthResponse } from "@/types/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AuthResponse>> {
  // The proxy (src/proxy.ts) already gatekeeps `/api/admin/*`, but this
  // handler re-checks authorization itself rather than trusting it alone.
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  if (id === currentUser.id) {
    return NextResponse.json(
      { success: false, message: "You cannot change your own role" },
      { status: 400 }
    );
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

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await User.findByIdAndUpdate(id, { role: parsed.data.role }, { new: true });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: toSafeUser(user) }, { status: 200 });
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
