import type { DiscountType } from "@/models/Coupon";
import type { ProductCategory } from "@/lib/data/categories";

export type { DiscountType };

export interface CouponView {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  /** Unset/empty - applies to the whole cart. Otherwise the discount only
   *  applies to the subtotal of lines in one of these categories. */
  applicableCategories?: ProductCategory[];
  /** Total rupees this coupon has discounted off real orders so far. */
  totalDiscountGiven: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CouponErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface CouponSuccessResponse {
  success: true;
  coupon: CouponView;
}

export type CouponResponse = CouponSuccessResponse | CouponErrorResponse;

export interface CouponDeleteSuccessResponse {
  success: true;
}

export type CouponDeleteResponse = CouponDeleteSuccessResponse | CouponErrorResponse;

/** One real cart line, sent to the server so it can compute an authoritative
 *  subtotal/discount itself - never the client's own price. */
export interface CouponEvaluationItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

/** Result of applying/previewing a coupon against real cart items - not yet consumed. */
export interface AppliedCoupon {
  code: string;
  discountType: DiscountType;
  value: number;
  discountAmount: number;
}

export interface ApplyCouponSuccessResponse {
  success: true;
  coupon: AppliedCoupon;
}

export type ApplyCouponResponse = ApplyCouponSuccessResponse | CouponErrorResponse;

/** A real, currently-usable coupon shown in "Available Offers" - only the
 *  fields a customer should ever see (never usage counts/limits, never an
 *  internal id). */
export interface PublicOfferView {
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderAmount?: number;
  applicableCategories?: ProductCategory[];
  expiresAt?: string;
}

export interface OffersSuccessResponse {
  success: true;
  offers: PublicOfferView[];
}

export type OffersResponse = OffersSuccessResponse | CouponErrorResponse;
