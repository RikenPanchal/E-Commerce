import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import User, { type UserAddress, type UserDocument } from "@/models/User";
import type { AddressInput } from "@/lib/validations/account";
import type { AddressView } from "@/types/account";

function toAddressView(address: UserAddress): AddressView {
  return {
    id: address._id.toString(),
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

// `UserAttributes.addresses` is typed as a plain array (so it also works as
// a Mongoose schema definition), but at runtime a schema-defined subdocument
// array is always a real `Types.DocumentArray`, which is what actually
// carries `.id()`. This cast just tells TypeScript what's already true.
function addressesOf(user: UserDocument): Types.DocumentArray<UserAddress> {
  return user.addresses as unknown as Types.DocumentArray<UserAddress>;
}

export async function getAddressesForUser(userId: string): Promise<AddressView[]> {
  await connectDB();
  const user = await User.findById(userId).select("addresses");
  if (!user) {
    return [];
  }
  return user.addresses.map(toAddressView);
}

export type AddressResult = { address: AddressView } | { error: string };

export async function addAddress(userId: string, input: AddressInput): Promise<AddressResult> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    return { error: "Account not found" };
  }

  // The very first address is always the default, regardless of what was submitted.
  const shouldBeDefault = input.isDefault || user.addresses.length === 0;
  if (shouldBeDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  user.addresses.push({ ...input, isDefault: shouldBeDefault } as UserAddress);
  await user.save();

  const created = user.addresses[user.addresses.length - 1];
  return { address: toAddressView(created) };
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressInput
): Promise<AddressResult> {
  if (!isValidObjectId(addressId)) {
    return { error: "Address not found" };
  }
  await connectDB();

  const user = await User.findById(userId);
  if (!user) {
    return { error: "Account not found" };
  }

  const address = addressesOf(user).id(addressId);
  if (!address) {
    return { error: "Address not found" };
  }

  if (input.isDefault) {
    user.addresses.forEach((item) => {
      item.isDefault = false;
    });
  }

  address.set({ ...input, isDefault: input.isDefault || address.isDefault });
  await user.save();

  return { address: toAddressView(address) };
}

export type DeleteAddressResult = { success: true } | { error: string };

export async function deleteAddress(userId: string, addressId: string): Promise<DeleteAddressResult> {
  if (!isValidObjectId(addressId)) {
    return { error: "Address not found" };
  }
  await connectDB();

  const user = await User.findById(userId);
  if (!user) {
    return { error: "Account not found" };
  }

  const address = addressesOf(user).id(addressId);
  if (!address) {
    return { error: "Address not found" };
  }

  const wasDefault = address.isDefault;
  address.deleteOne();

  // Promote another address to default so there's always one, if any remain.
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return { success: true };
}
