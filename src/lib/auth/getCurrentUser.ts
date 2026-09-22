import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/mappers";
import type { SafeUser } from "@/types/auth";

/** Resolves the signed-in user (if any) from the auth cookie, verified against the database. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const authUser = await getAuthUser();
  if (!authUser) {
    return null;
  }

  try {
    await connectDB();
    const user = await User.findById(authUser.userId);
    return user ? toSafeUser(user) : null;
  } catch (error) {
    console.error("Failed to resolve current user:", error);
    return null;
  }
}
