import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";

// Gatekeeps `/admin/*` (pages) and `/api/admin/*` (mutations). Every route
// handler and Server Component still re-checks the role itself - this is a
// fast first line of defense, not the only one (see the Next.js Data
// Security guide).
export async function proxy(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  function denyUnauthenticated() {
    if (isApiRoute) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  function denyForbidden() {
    if (isApiRoute) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authUser = token ? verifyAuthToken(token) : null;
  if (!authUser) {
    return denyUnauthenticated();
  }

  // The JWT's `role` claim is a snapshot from sign-in time. Re-checking the
  // live value here means a promotion or demotion takes effect immediately,
  // instead of waiting up to 7 days for the token to expire.
  try {
    await connectDB();
    const user = await User.findById(authUser.userId).select("role");
    if (!user || user.role !== "admin") {
      return denyForbidden();
    }
  } catch (error) {
    console.error("Proxy role check failed:", error);
    return denyForbidden();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
