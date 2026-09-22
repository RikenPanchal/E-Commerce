import type { UserDocument } from "@/models/User";
import type { SafeUser } from "@/types/auth";

/** Strips the password hash and Mongo-specific fields before sending a user to the client. */
export function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
