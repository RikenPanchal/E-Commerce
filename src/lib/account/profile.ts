import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { toSafeUser } from "@/lib/auth/mappers";
import { isDuplicateKeyError } from "@/lib/db/errors";
import type { ChangePasswordInput, UpdateProfileInput } from "@/lib/validations/account";
import type { SafeUser } from "@/types/auth";

export type UpdateProfileResult = { user: SafeUser } | { error: string };

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  await connectDB();
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { name: input.name, email: input.email },
      { new: true, runValidators: true }
    );
    if (!user) {
      return { error: "Account not found" };
    }
    return { user: toSafeUser(user) };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: "An account with this email already exists" };
    }
    throw error;
  }
}

export type ChangePasswordResult = { success: true } | { error: string };

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<ChangePasswordResult> {
  await connectDB();
  const user = await User.findById(userId).select("+password");
  if (!user) {
    return { error: "Account not found" };
  }

  const isCurrentPasswordValid = await verifyPassword(input.currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return { error: "Current password is incorrect" };
  }

  user.password = await hashPassword(input.newPassword);
  await user.save();
  return { success: true };
}
