import { randomBytes } from "node:crypto";
import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Product from "@/models/Product";
import BackInStockSubscription, {
  type BackInStockSubscriptionDocument,
} from "@/models/BackInStockSubscription";
import { toProductView } from "@/lib/products/mapper";
import { hasVariants } from "@/lib/shop/variants";
import { isEmailConfigured } from "@/lib/email/mailer";
import { sendBackInStockEmail } from "@/lib/email/backInStockEmail";
import { absoluteUrl } from "@/lib/seo/site";
import { runAfterResponse } from "@/lib/utils/afterResponse";
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

/** How many restock emails go out at once - small on purpose: Gmail (the
 *  default transport, see mailer.ts) throttles or rejects bursts of
 *  parallel SMTP connections from one account. */
const SEND_CONCURRENCY = 3;

/**
 * Emails one subscriber. The subscription is *claimed* first with a single
 * atomic active -> notified update, so two restocks landing at the same
 * moment (e.g. an admin save and an order-cancellation restock) can never
 * email the same person twice; if the send then fails, it's put back to
 * active so the next restock tries again instead of silently dropping it.
 */
async function notifySubscriber(
  subscription: BackInStockSubscriptionDocument,
  product: ProductView,
  variant?: ProductVariantView
): Promise<void> {
  const claimed = await BackInStockSubscription.findOneAndUpdate(
    { _id: subscription._id, status: "active" },
    { $set: { status: "notified", notifiedAt: new Date() } }
  );
  if (!claimed) return; // Already notified by a concurrent run, or cancelled meanwhile.

  const image = product.media.find((item) => item.type === "image")?.url;
  try {
    await sendBackInStockEmail({
      to: subscription.email,
      productName: product.name,
      variantLabel: variant ? [variant.size, variant.color].filter(Boolean).join(" / ") || undefined : undefined,
      price: variant?.price ?? product.price,
      productUrl: absoluteUrl(`/products/${product.slug}`),
      imageUrl: image ? absoluteUrl(image) : undefined,
    });
  } catch (error) {
    await BackInStockSubscription.updateOne(
      { _id: subscription._id, status: "notified" },
      { $set: { status: "active", notifiedAt: null } }
    );
    console.error(`Failed to send back-in-stock email for subscription ${subscription._id.toString()}:`, error);
  }
}

/**
 * The one place that decides "does this stock change deserve a
 * notification" - fires only on an unavailable -> available transition
 * (`previousStock <= 0` and `newStock > 0`), driven by whatever the real
 * mutation just wrote, never a separate polled stock check. Called from the
 * places that change stock outside of checkout: an admin product update,
 * an admin order cancellation, and a failed/abandoned payment's restock.
 *
 * The subscriber lookup happens here; the emails themselves go out after
 * the response (see `runAfterResponse` in src/lib/utils/afterResponse.ts), a few at a time, each isolated so
 * one failure can't affect the others. When email isn't configured at all,
 * nobody is marked notified - their alerts stay active for a later restock.
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

  const subscriptions = await BackInStockSubscription.find({
    product: productId,
    variantId: variantId ?? null,
    status: "active",
  });
  if (subscriptions.length === 0) return;

  if (!isEmailConfigured()) {
    console.error(
      `Back in stock: ${subscriptions.length} subscriber(s) for product ${product._id.toString()} were not emailed because EMAIL_USER/EMAIL_PASS aren't set - their alerts stay active.`
    );
    return;
  }

  const productView = toProductView(product);
  const variant = variantId ? productView.variants.find((item) => item.id === variantId.toString()) : undefined;

  runAfterResponse("Back-in-stock notification batch", async () => {
    for (let index = 0; index < subscriptions.length; index += SEND_CONCURRENCY) {
      const batch = subscriptions.slice(index, index + SEND_CONCURRENCY);
      await Promise.allSettled(batch.map((subscription) => notifySubscriber(subscription, productView, variant)));
    }
  });
}
