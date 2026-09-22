import { randomBytes } from "node:crypto";
import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Product from "@/models/Product";
import BackInStockSubscription, {
  type BackInStockSubscriptionDocument,
} from "@/models/BackInStockSubscription";
import { toProductView } from "@/lib/products/mapper";
import { hasVariants } from "@/lib/shop/variants";
import type { SafeUser } from "@/types/auth";
import type { ProductView, ProductVariantView } from "@/types/product";

/** A random, unguessable unsubscribe token - see the doc comment on
 *  `unsubscribeToken` on the model for why this is stored as-is rather than
 *  hashed like `passwordReset.ts`'s reset token. */
function generateUnsubscribeToken(): string {
  return randomBytes(32).toString("hex");
}

export interface SubscribeToBackInStockInput {
  productId: string;
  variantId?: string;
  /** Only used for a guest request - an authenticated request always uses
   *  the signed-in account's own email instead (see below). */
  email?: string;
}

export type SubscribeToBackInStockResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

/**
 * The one entry point for creating/reactivating a back-in-stock alert.
 * Re-validates everything server-side - product existence, variant
 * existence, and that the item is *actually* unavailable right now - so a
 * request can never be trusted at face value from the frontend.
 */
export async function subscribeToBackInStock(
  input: SubscribeToBackInStockInput,
  user: SafeUser | null
): Promise<SubscribeToBackInStockResult> {
  if (!isValidObjectId(input.productId)) {
    return { ok: false, error: "This product could not be found." };
  }

  await connectDB();
  const product = await Product.findOne({ _id: input.productId, isDeleted: false });
  if (!product) {
    return { ok: false, error: "This product could not be found." };
  }

  const productView = toProductView(product);
  let variant: ProductVariantView | undefined;

  if (hasVariants(productView)) {
    if (!input.variantId || !isValidObjectId(input.variantId)) {
      return { ok: false, error: "Please select a size/color first." };
    }
    variant = productView.variants.find((item) => item.id === input.variantId);
    if (!variant) {
      return { ok: false, error: "This option could not be found." };
    }
    // Same rule `resolveVariant` applies (`isActive && stock > 0`) - checked
    // directly since the exact variant is already in hand by id.
    if (variant.isActive && variant.stock > 0) {
      return { ok: false, error: "This item is already available - no need to wait!" };
    }
  } else {
    if (product.stock > 0) {
      return { ok: false, error: "This item is already available - no need to wait!" };
    }
  }

  const email = user ? user.email : input.email?.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Please enter your email address." };
  }

  const filter = {
    product: product._id,
    variantId: variant ? new Types.ObjectId(variant.id) : null,
    email,
  };

  // Non-atomic pre-check, used only to decide the message shown - the
  // upsert below is what actually makes the state change atomic and race-safe.
  const existing = await BackInStockSubscription.findOne(filter);
  const alreadySubscribed = existing?.status === "active";

  await BackInStockSubscription.findOneAndUpdate(
    filter,
    {
      $set: { status: "active", notifiedAt: null, user: user ? new Types.ObjectId(user.id) : null },
      $setOnInsert: { unsubscribeToken: generateUnsubscribeToken() },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return { ok: true, alreadySubscribed };
}

/** Cancels via the token from an unsubscribe link/email - no login required,
 *  and a wrong/expired/already-used token just fails quietly (never reveals
 *  whether a token ever existed). */
export async function cancelBackInStockSubscriptionByToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  await connectDB();
  const result = await BackInStockSubscription.updateOne(
    { unsubscribeToken: rawToken, status: { $ne: "cancelled" } },
    { $set: { status: "cancelled" } }
  );
  return result.modifiedCount > 0;
}

/** Cancels from the Account page - ownership-checked so one signed-in user
 *  can never cancel another's alert by guessing an id. */
export async function cancelBackInStockSubscriptionForUser(
  userId: string,
  subscriptionId: string
): Promise<boolean> {
  if (!isValidObjectId(subscriptionId)) return false;
  await connectDB();
  const result = await BackInStockSubscription.updateOne(
    { _id: subscriptionId, user: userId, status: { $ne: "cancelled" } },
    { $set: { status: "cancelled" } }
  );
  return result.modifiedCount > 0;
}

export interface BackInStockAlertView {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  variantId?: string;
  size?: string;
  color?: string;
  status: "active" | "notified";
  createdAt: string;
}

/** The signed-in customer's own alerts, for the Account page - active and
 *  already-notified ones (so they can see it fired), never cancelled ones. */
export async function getActiveBackInStockSubscriptionsForUser(userId: string): Promise<BackInStockAlertView[]> {
  await connectDB();
  const subscriptions = await BackInStockSubscription.find({
    user: userId,
    status: { $in: ["active", "notified"] },
  }).sort({ createdAt: -1 });

  if (subscriptions.length === 0) return [];

  const productIds = [...new Set(subscriptions.map((sub) => sub.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const alerts: BackInStockAlertView[] = [];
  for (const sub of subscriptions) {
    const product = productMap.get(sub.product.toString());
    if (!product) continue; // Product deleted since subscribing - drop it silently, don't crash.
    const variant = sub.variantId
      ? product.variants.find((item) => item._id.toString() === sub.variantId?.toString())
      : undefined;
    alerts.push({
      id: sub._id.toString(),
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.slug,
      productImage: product.media.find((item) => item.type === "image")?.url,
      variantId: variant?._id.toString(),
      size: variant?.size,
      color: variant?.color,
      status: sub.status === "notified" ? "notified" : "active",
      createdAt: sub.createdAt.toISOString(),
    });
  }
  return alerts;
}

/**
 * No real email provider is configured anywhere in this app yet (the same
 * is true of password reset - see `forgot-password/route.ts`), so this
 * mirrors that exact precedent: log what would be sent and report success,
 * rather than fabricate a provider. Swapping in a real one later is a
 * drop-in change to this one function; nothing else needs to change since
 * `processBackInStockTransition` already only marks a subscriber
 * `"notified"` when this returns `true`.
 */
export async function sendBackInStockEmail(
  subscription: BackInStockSubscriptionDocument,
  product: ProductView,
  variant?: ProductVariantView
): Promise<boolean> {
  const variantLabel = variant ? [variant.size, variant.color].filter(Boolean).join(" / ") : undefined;
  const productUrl = `/products/${product.slug}`;
  const unsubscribeUrl = `/unsubscribe/back-in-stock?token=${subscription.unsubscribeToken}`;
  try {
    console.log(
      `[back-in-stock email:stub] To: ${subscription.email} - "${product.name}"` +
        (variantLabel ? ` (${variantLabel})` : "") +
        ` is back in stock. Link: ${productUrl} | Unsubscribe: ${unsubscribeUrl}`
    );
    return true;
  } catch (error) {
    console.error("Failed to send back-in-stock email:", error);
    return false;
  }
}

/**
 * The one place that decides "does this stock change deserve a
 * notification" - fires only on an unavailable -> available transition
 * (`previousStock <= 0` and `newStock > 0`), driven by whatever the real
 * mutation just wrote, never a separate polled stock check. Called from the
 * exact two places that change stock outside of checkout: an admin product
 * update and an order cancellation restock.
 *
 * No queue/background-job system exists anywhere in this app, so this runs
 * inline, synchronously, with each subscriber's send isolated (a failed one
 * is logged and skipped) so one failure can't affect the others or block
 * the rest of the batch.
 */
export async function processBackInStockTransition(
  productId: Types.ObjectId | string,
  variantId: Types.ObjectId | string | null,
  previousStock: number,
  newStock: number
): Promise<void> {
  if (previousStock > 0 || newStock <= 0) return;

  await connectDB();
  const product = await Product.findById(productId);
  if (!product) return; // Deleted concurrently - nothing to notify about.

  const productView = toProductView(product);
  const variant = variantId ? productView.variants.find((item) => item.id === variantId.toString()) : undefined;

  const subscriptions = await BackInStockSubscription.find({
    product: productId,
    variantId: variantId ?? null,
    status: "active",
  }).select("+unsubscribeToken");

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        const sent = await sendBackInStockEmail(subscription, productView, variant);
        if (sent) {
          subscription.status = "notified";
          subscription.notifiedAt = new Date();
          await subscription.save();
        }
      } catch (error) {
        console.error(`Failed to notify subscriber ${subscription._id.toString()}:`, error);
      }
    })
  );
}
