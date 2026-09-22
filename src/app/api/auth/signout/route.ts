import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/session";

export async function POST(): Promise<NextResponse<{ success: true }>> {
  const response = NextResponse.json<{ success: true }>({ success: true }, { status: 200 });
  clearAuthCookie(response);
  return response;
}
