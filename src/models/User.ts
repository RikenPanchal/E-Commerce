import { Schema, model, models, Types, type Model, type HydratedDocument } from "mongoose";
import type { UserRole } from "@/types/auth";

export interface UserAddress {
  _id: Types.ObjectId;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface UserAttributes {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  addresses: UserAddress[];
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserAttributes>;

const userAddressSchema = new Schema<UserAddress>(
  {
    label: { type: String, trim: true, maxlength: 30 },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new Schema<UserAttributes>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    // Not exposed on the signup form - every account starts as "user".
    // Promote an account to "admin" with `npm run make-admin -- <email>`.
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },
    addresses: { type: [userAddressSchema], default: [] },
    // Only a hash of the reset token is stored - never the raw token - so a
    // database leak alone can't be used to reset anyone's password.
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// `models.User` already exists after the first compile in dev (hot reload),
// so re-use it instead of calling `model()` again which would throw.
const User: Model<UserAttributes> =
  (models.User as Model<UserAttributes>) || model<UserAttributes>("User", userSchema);

export default User;
