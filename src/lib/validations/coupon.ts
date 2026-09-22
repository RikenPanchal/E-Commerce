import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters")
      .max(20, "Code must be at most 20 characters")
      .regex(/^[A-Za-z0-9]+$/, "Use letters and numbers only"),
    discountType: z.enum(["percentage", "fixed"]),
    value: z.coerce.number("Value must be a number").positive("Value must be greater than 0"),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxUses: z.coerce.number().int().min(1).optional(),
    // Optional and additive - an empty array is treated the same as
    // "unset" (applies to the whole cart), so callers can just always send
    // whatever the checkbox group currently has selected.
    applicableCategories: z.array(z.enum(PRODUCT_CATEGORIES)).optional(),
    expiresAt: z.string().trim().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.discountType !== "percentage" || data.value <= 100, {
    message: "Percentage discounts can't exceed 100",
    path: ["value"],
  });

export type CouponInput = z.infer<typeof couponSchema>;

// One line per real cart item, exactly what the server needs to compute an
// authoritative subtotal/discount itself (product id + quantity, optionally
// a variant id) - the client's own price is never part of this, so a
// coupon's discount can never be trusted or computed from client-sent
// numbers, only from what the server looks up.
const couponEvaluationItemSchema = z.object({
  productId: z.string().refine(isValidObjectId, "Invalid product"),
  variantId: z.string().refine(isValidObjectId, "Invalid variant").optional(),
  quantity: z.coerce.number().int().positive(),
});

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code"),
  items: z.array(couponEvaluationItemSchema).min(1, "Your bag is empty"),
});

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CouponEvaluationItemInput = z.infer<typeof couponEvaluationItemSchema>;
