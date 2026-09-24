import type { OrderStatus, PaymentStatus, ShippingAddress } from "@/models/Order";

export type { ShippingAddress, OrderStatus, PaymentStatus };

export interface OrderItemView {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  image?: string;
  size?: string;
  color?: string;
  sku?: string;
  quantity: number;
}

export interface OrderView {
  id: string;
  items: OrderItemView[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  couponCode?: string;
  discountAmount: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface OrderSuccessResponse {
  success: true;
  order: OrderView;
}

export interface OrderErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type OrderResponse = OrderSuccessResponse | OrderErrorResponse;

/** What Razorpay Checkout needs client-side to open the payment modal -
 *  `keyId` is the public key id (safe to expose), `orderId`/`amount`/
 *  `currency` are the just-created Razorpay order this payment must be
 *  made against. */
export interface RazorpayCheckoutParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
}

export interface PlaceOrderSuccessResponse extends OrderSuccessResponse {
  razorpay: RazorpayCheckoutParams;
}

export type PlaceOrderResponse = PlaceOrderSuccessResponse | OrderErrorResponse;
