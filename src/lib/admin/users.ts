import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { toSafeUser } from "@/lib/auth/mappers";
import type { SafeUser } from "@/types/auth";

/** Most recently joined accounts, newest first. */
export async function getAllUsers(limit = 200): Promise<SafeUser[]> {
  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).limit(limit);
  return users.map(toSafeUser);
}
