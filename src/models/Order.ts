import { Schema, model, models, Types, type Model, type HydratedDocument } from "mongoose";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

/** Once an order reaches one of these, its status can no longer change. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

/** Independent of `OrderStatus` (fulfillment stage) - an order is created,
 *  with stock already reserved, the moment checkout starts (see `placeOrder`
 *  in src/lib/shop/orders.ts), before Razorpay payment is confirmed. Its
 *  `status` stays "pending" throughout; `paymentStatus` is what actually
 *  tracks whether real money has arrived.
 *  - "pending": Razorpay order created, payment not yet confirmed.
 *  - "paid": payment signature verified (or webhook-confirmed) - the only
 *    state in which an order should ever be processed/shipped.
 *  - "failed": payment was declined, or the checkout was abandoned/
 *    cancelled - stock has been released back (see `failOrderPayment`). */
export type PaymentStatus = "pending" | "paid" | "failed";

export interface OrderItemAttributes {
  product: Types.ObjectId;
  /** The exact variant purchased, when the product used the variant system
   *  at checkout time - permanently preserved even if that variant is later
   *  edited or removed from the product, so this historical record never
   *  changes retroactively. */
  variantId?: Types.ObjectId;
  name: string;
  price: number;
  image?: string;
  size?: string;
  color?: string;
  sku?: string;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface OrderAttributes {
  user: Types.ObjectId;
  items: OrderItemAttributes[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  couponCode?: string;
  discountAmount: number;
  /** Delivery fee for this order, computed once at checkout from the
   *  shipping address's city/state (see src/lib/shop/shipping.ts) and
   *  stored permanently - so an order's total stays correct and auditable
   *  even if the zone rates change later. */
  shippingCost: number;
  total: number;
  status: OrderStatus;
  /** Always "razorpay" today - kept as a field (not a hardcoded assumption
   *  elsewhere) so a second provider could be added later without a schema
   *  migration. */
  paymentProvider: "razorpay";
  paymentStatus: PaymentStatus;
  /** Razorpay's own order id (`order_...`) - created alongside this order
   *  and used to verify the payment signature, look the order up from a
   *  webhook event, and let the customer retry payment against the exact
   *  same Razorpay order if their first attempt failed. */
  razorpayOrderId?: string;
  /** Set only once payment is verified - the specific payment (`pay_...`)
   *  that actually paid for this order. */
  razorpayPaymentId?: string;
  paidAt?: Date | null;
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = HydratedDocument<OrderAttributes>;

const orderItemSchema = new Schema<OrderItemAttributes>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    size: { type: String },
    color: { type: String },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<ShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<OrderAttributes>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: OrderItemAttributes[]) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentProvider: { type: String, enum: ["razorpay"], required: true, default: "razorpay" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      required: true,
      default: "pending",
    },
    razorpayOrderId: { type: String, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    paidAt: { type: Date, default: null },
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
// Looked up by Razorpay's own order id from both the webhook handler and
// the client-side verify call - sparse since only orders that reached
// checkout have one (and it's set exactly once, at creation).
orderSchema.index({ razorpayOrderId: 1 }, { sparse: true });
// The stale-checkout cleanup job (src/app/api/cron/expire-pending-orders)
// scans exactly this shape - unpaid orders, oldest first.
orderSchema.index({ paymentStatus: 1, createdAt: 1 });

const Order: Model<OrderAttributes> =
  (models.Order as Model<OrderAttributes>) || model<OrderAttributes>("Order", orderSchema);

export default Order;
