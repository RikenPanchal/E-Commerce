import { Schema, model, models, type Model } from "mongoose";

/** One fixed-window request counter, e.g. "signin:ip:1.2.3.4" - see
 *  src/lib/security/rateLimit.ts. Stored in MongoDB (not process memory)
 *  because on Vercel every request can hit a different serverless instance,
 *  so an in-memory counter would reset constantly and barely slow anyone
 *  down. */
export interface RateLimitAttributes {
  key: string;
  count: number;
  /** When this window ends - the TTL index below deletes the document
   *  shortly after, so old counters clean themselves up. */
  expiresAt: Date;
}

const rateLimitSchema = new Schema<RateLimitAttributes>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

// MongoDB's TTL monitor removes each document once `expiresAt` has passed
// (it runs about once a minute, so expiry isn't exact - the limiter itself
// also checks `expiresAt`, so a not-yet-deleted stale window never counts).
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit: Model<RateLimitAttributes> =
  (models.RateLimit as Model<RateLimitAttributes>) || model<RateLimitAttributes>("RateLimit", rateLimitSchema);

export default RateLimit;
