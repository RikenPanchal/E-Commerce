import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Missing product"),
  variantId: z.string().trim().min(1).optional(),
  quantity: z.coerce.number("Quantity must be a number").int().min(1).max(20),
  size: z.string().trim().max(10).optional(),
  color: z.string().trim().max(40).optional(),
});

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  line1: z.string().trim().min(3, "Address is required").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  postalCode: z.string().trim().min(3, "Postal code is required").max(20),
});

export const placeOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "Your cart is empty"),
  shippingAddress: shippingAddressSchema,
  couponCode: z.string().trim().max(20).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
  trackingNumber: z.string().trim().max(60).optional(),
  carrier: z.string().trim().max(60).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

/** The three fields Razorpay Checkout's client-side `handler` callback
 *  hands back on a successful payment - never trusted as-is, only ever used
 *  to re-derive and verify the HMAC signature server-side (see
 *  `verifyPaymentSignature` in src/lib/payments/razorpay.ts). */
export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(1, "Missing Razorpay order id"),
  razorpayPaymentId: z.string().trim().min(1, "Missing Razorpay payment id"),
  razorpaySignature: z.string().trim().min(1, "Missing Razorpay signature"),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
