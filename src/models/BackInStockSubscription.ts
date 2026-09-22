import { Schema, model, models, type Model, type HydratedDocument, type Types } from "mongoose";

export type BackInStockStatus = "active" | "notified" | "cancelled";

export interface BackInStockSubscriptionAttributes {
  product: Types.ObjectId;
  /** The exact variant this subscription is for - `null` only when the
   *  product itself has no variants at all (see `ProductVariant` on the
   *  Product model). Never left generically "product-level" for a product
   *  that DOES have variants; the customer's exact selection is always
   *  captured when one exists, matching the requirement that a
   *  Black/M subscriber is never notified for a Black/L restock. */
  variantId: Types.ObjectId | null;
  /** Always a real email, lowercased - for an authenticated subscriber this
   *  is their account email (never a client-supplied one, so a signed-in
   *  customer can't be subscribed under an email that isn't theirs); for a
   *  guest it's whatever they typed in, validated. */
  email: string;
  /** Set only when the subscriber was signed in at the time they
   *  subscribed - lets the account page list "their" alerts. A guest
   *  subscription (or one from before this field existed) has none, and
   *  is still fully functional purely by email. */
  user?: Types.ObjectId | null;
  status: BackInStockStatus;
  /** A random, unguessable token - lets the unsubscribe link in a
   *  notification email work without requiring sign-in, without letting
   *  anyone guess/cancel someone else's alert by id alone. Unlike a password
   *  reset token (hashed, since it grants full account access and is used
   *  once right after being issued), this one has to be re-embedded in an
   *  email sent later, whenever the item actually restocks - so it's kept
   *  as-is rather than hashed, `select: false` so it's still never returned
   *  by a normal query. The action it unlocks (cancel a restock alert) has
   *  no sensitive consequence if it ever leaked, unlike a password reset. */
  unsubscribeToken: string;
  notifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BackInStockSubscriptionDocument = HydratedDocument<BackInStockSubscriptionAttributes>;

const backInStockSubscriptionSchema = new Schema<BackInStockSubscriptionAttributes>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    email: { type: String, required: true, trim: true, lowercase: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["active", "notified", "cancelled"], default: "active" },
    unsubscribeToken: { type: String, required: true, select: false },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One subscription per (product, exact variant, email) - re-subscribing
// reactivates the existing document (see `subscribeToBackInStock`) rather
// than ever creating a second row, and this index is the hard backstop
// against a race producing a duplicate. `variantId: null` is itself a valid,
// consistent value for every non-variant product, so this still enforces
// "one per product per email" correctly in that case.
backInStockSubscriptionSchema.index({ product: 1, variantId: 1, email: 1 }, { unique: true });
// The trigger path's hot query: "which active subscribers does this exact
// product+variant have right now".
backInStockSubscriptionSchema.index({ product: 1, variantId: 1, status: 1 });
// The account page's query: "this signed-in customer's own active alerts".
backInStockSubscriptionSchema.index({ user: 1, status: 1 });
// The unsubscribe link's lookup - unique since it's the sole thing that
// identifies which subscription a token cancels.
backInStockSubscriptionSchema.index({ unsubscribeToken: 1 }, { unique: true });

const BackInStockSubscription: Model<BackInStockSubscriptionAttributes> =
  (models.BackInStockSubscription as Model<BackInStockSubscriptionAttributes>) ||
  model<BackInStockSubscriptionAttributes>("BackInStockSubscription", backInStockSubscriptionSchema);

export default BackInStockSubscription;
