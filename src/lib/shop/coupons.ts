import { connectDB } from "@/lib/db/connectDB";
import Coupon, { type CouponDocument } from "@/models/Coupon";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { formatCurrency } from "@/lib/utils/currency";
import type { AppliedCoupon, CouponEvaluationItem, PublicOfferView } from "@/types/coupon";

export type EvaluateCouponResult = { coupon: AppliedCoupon } | { error: string };

/**
 * Validates a coupon code against live rules (active, not expired, usage
 * caps, minimum order, category restriction, one redemption per customer)
 * and computes the discount - entirely from real product data looked up
 * here, never from a client-sent subtotal or price. Used both for the
 * cart/checkout preview and - re-run again server-side at order placement,
 * from the same real order lines - so the two can never disagree.
 */
export async function evaluateCoupon(
  rawCode: string,
  items: CouponEvaluationItem[],
  userId?: string
): Promise<EvaluateCouponResult> {
  await connectDB();
  const code = rawCode.trim().toUpperCase();

  const coupon = await Coupon.findOne({ code });
  if (!coupon || !coupon.isActive) {
    return { error: "Invalid coupon code" };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { error: "This coupon has expired" };
  }
  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
    return { error: "This coupon has reached its usage limit" };
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isDeleted: false });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const restrictedToCategories = coupon.applicableCategories && coupon.applicableCategories.length > 0;

  let subtotal = 0;
  let eligibleSubtotal = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue; // Deleted/unavailable since - contributes nothing either way.

    const variant = item.variantId ? product.variants.find((v) => v._id.toString() === item.variantId) : undefined;
    const price = variant?.price ?? product.price;
    const lineTotal = price * item.quantity;
    subtotal += lineTotal;

    const isEligible = !restrictedToCategories || coupon.applicableCategories!.includes(product.category);
    if (isEligible) {
      eligibleSubtotal += lineTotal;
    }
  }

  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return {
      error: `This coupon requires a minimum order of ${formatCurrency(coupon.minOrderAmount)}`,
    };
  }
  if (restrictedToCategories && eligibleSubtotal <= 0) {
    return { error: "This coupon isn't valid for the items in your bag" };
  }
  if (userId) {
    // Paid, not just "not cancelled" - an order can sit at `status:
    // "pending"` while its Razorpay payment is still in flight (or never
    // completes). Checking fulfillment status alone would wrongly block a
    // customer from re-applying a coupon after an abandoned/failed
    // checkout that never actually redeemed it.
    const alreadyUsed = await Order.exists({
      user: userId,
      couponCode: code,
      paymentStatus: "paid",
    });
    if (alreadyUsed) {
      return { error: "You've already used this coupon" };
    }
  }

  const discountAmount =
    coupon.discountType === "percentage"
      ? Math.round((eligibleSubtotal * coupon.value) / 100)
      : Math.min(coupon.value, eligibleSubtotal);

  return {
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      discountAmount,
    },
  };
}

/** Marks a coupon as redeemed - call only after the order it applies to is confirmed created. */
export async function recordCouponUsage(code: string): Promise<void> {
  await connectDB();
  await Coupon.updateOne({ code: code.trim().toUpperCase() }, { $inc: { usedCount: 1 } });
}

function toPublicOfferView(coupon: CouponDocument): PublicOfferView {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    applicableCategories: coupon.applicableCategories,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : undefined,
  };
}

/**
 * Real, currently-usable coupons for the "Available Offers" section - active,
 * not expired, not maxed out, and (for a signed-in customer) not already
 * redeemed by them. Deliberately excludes `usedCount`/`maxUses` and any
 * other admin-facing field from the returned shape - a customer sees a real
 * code and its real terms, never usage-counter/promotional pressure data.
 * Returns an empty list rather than a placeholder when nothing qualifies.
 */
export async function getPublicOffers(userId?: string): Promise<PublicOfferView[]> {
  await connectDB();

  const candidates = await Coupon.find({
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).sort({ createdAt: -1 });

  const usable = candidates.filter((coupon) => coupon.maxUses === undefined || coupon.usedCount < coupon.maxUses);
  if (usable.length === 0) return [];

  if (!userId) {
    return usable.map(toPublicOfferView);
  }

  const usedCodes = new Set(
    await Order.distinct("couponCode", { user: userId, couponCode: { $ne: null }, paymentStatus: "paid" })
  );
  return usable.filter((coupon) => !usedCodes.has(coupon.code)).map(toPublicOfferView);
}
