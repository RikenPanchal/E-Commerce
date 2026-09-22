import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Coupon, { type CouponDocument } from "@/models/Coupon";
import Order from "@/models/Order";
import { isDuplicateKeyError } from "@/lib/db/errors";
import type { CouponInput } from "@/lib/validations/coupon";
import type { CouponView } from "@/types/coupon";

export function toCouponView(coupon: CouponDocument, totalDiscountGiven = 0): CouponView {
  return {
    id: coupon._id.toString(),
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    maxUses: coupon.maxUses,
    usedCount: coupon.usedCount,
    applicableCategories: coupon.applicableCategories,
    totalDiscountGiven,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : undefined,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt.toISOString(),
  };
}

/** How much each coupon code has actually discounted off real orders, in
 *  rupees - `usedCount` on the coupon itself only says how many times it
 *  was applied, not how much money that added up to. Matches `usedCount`'s
 *  own semantics by counting every order regardless of later cancellation,
 *  so the two numbers stay consistent with each other. */
async function getDiscountTotalsByCode(): Promise<Map<string, number>> {
  await connectDB();
  const totals = await Order.aggregate<{ _id: string; totalDiscount: number }>([
    { $match: { couponCode: { $exists: true, $ne: null } } },
    { $group: { _id: "$couponCode", totalDiscount: { $sum: "$discountAmount" } } },
  ]);
  return new Map(totals.map((row) => [row._id, row.totalDiscount]));
}

export async function getAllCoupons(limit = 200): Promise<CouponView[]> {
  await connectDB();
  const [coupons, discountTotals] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).limit(limit),
    getDiscountTotalsByCode(),
  ]);
  return coupons.map((coupon) => toCouponView(coupon, discountTotals.get(coupon.code) ?? 0));
}

export async function getCouponById(id: string): Promise<CouponView | null> {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();
  const coupon = await Coupon.findById(id);
  return coupon ? toCouponView(coupon) : null;
}

function toDocFields(input: CouponInput) {
  return {
    code: input.code.toUpperCase(),
    discountType: input.discountType,
    value: input.value,
    minOrderAmount: input.minOrderAmount,
    maxUses: input.maxUses,
    // Always written explicitly (never `undefined`) so clearing every
    // checkbox on an edit actually clears the restriction in the database -
    // an `undefined` value here would just be dropped from the update
    // instead of unsetting a previously-saved list. An empty array reads
    // identically to "unset" everywhere this field is checked.
    applicableCategories: input.applicableCategories ?? [],
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    isActive: input.isActive,
  };
}

export type CouponResult = { coupon: CouponDocument } | { error: string };

export async function createCoupon(input: CouponInput): Promise<CouponResult> {
  await connectDB();
  try {
    const coupon = await Coupon.create(toDocFields(input));
    return { coupon };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: "A coupon with this code already exists" };
    }
    throw error;
  }
}

export async function updateCoupon(id: string, input: CouponInput): Promise<CouponResult> {
  if (!isValidObjectId(id)) {
    return { error: "Coupon not found" };
  }
  await connectDB();
  try {
    const coupon = await Coupon.findByIdAndUpdate(id, toDocFields(input), {
      new: true,
      runValidators: true,
    });
    if (!coupon) {
      return { error: "Coupon not found" };
    }
    return { coupon };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: "A coupon with this code already exists" };
    }
    throw error;
  }
}

export async function deleteCoupon(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) {
    return false;
  }
  await connectDB();
  const result = await Coupon.findByIdAndDelete(id);
  return Boolean(result);
}
