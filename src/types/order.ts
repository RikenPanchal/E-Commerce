import type { OrderStatus, ShippingAddress } from "@/models/Order";

export type { ShippingAddress, OrderStatus };

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
