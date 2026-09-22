import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthTokenPayload } from "@/types/auth";
import { verifyAuthToken } from "@/lib/auth/jwt";

export const AUTH_COOKIE_NAME = "auth_token";

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

/** Attaches the auth cookie to a Route Handler response. */
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_IN_SECONDS,
  });
}

/** Removes the auth cookie from a Route Handler response. */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Reads and verifies the auth cookie from the incoming request (Server Components, Route Handlers). */
export async function getAuthUser(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}
