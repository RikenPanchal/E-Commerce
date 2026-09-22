import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/data/categories";

export type DiscountType = "percentage" | "fixed";

export interface CouponAttributes {
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  /** Optional and additive - an empty/unset list (every coupon before this
   *  field existed) means "applies to the whole cart", exactly as before.
   *  When set, the discount only applies to the subtotal of cart lines
   *  whose product is in one of these categories. */
  applicableCategories?: ProductCategory[];
  expiresAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CouponDocument = HydratedDocument<CouponAttributes>;

const couponSchema = new Schema<CouponAttributes>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0 },
    applicableCategories: { type: [String], enum: PRODUCT_CATEGORIES, default: undefined },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon: Model<CouponAttributes> =
  (models.Coupon as Model<CouponAttributes>) || model<CouponAttributes>("Coupon", couponSchema);

export default Coupon;
