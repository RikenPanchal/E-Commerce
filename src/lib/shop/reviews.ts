import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import Review, { type ReviewDocument } from "@/models/Review";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import type { ReviewInput } from "@/lib/validations/review";
import type { RatingSummary, ReviewPage, ReviewSort, ReviewView } from "@/types/review";

function toReviewView(review: ReviewDocument, userName: string): ReviewView {
  return {
    id: review._id.toString(),
    productId: review.product.toString(),
    userId: review.user.toString(),
    userName,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

/** True if the user has any non-cancelled order containing this product. */
export async function hasPurchasedProduct(userId: string, productId: string): Promise<boolean> {
  await connectDB();
  const order = await Order.exists({
    user: userId,
    status: { $ne: "cancelled" },
    "items.product": productId,
  });
  return Boolean(order);
}

export async function getUserReviewForProduct(
  userId: string,
  productId: string
): Promise<ReviewView | null> {
  if (!isValidObjectId(productId)) {
    return null;
  }
  await connectDB();
  const review = await Review.findOne({ user: userId, product: productId });
  if (!review) {
    return null;
  }
  const user = await User.findById(userId).select("name");
  return toReviewView(review, user?.name ?? "You");
}

/** Reviews shown per page on the product page - kept small so the section
 *  stays a compact block on every screen size. */
export const REVIEWS_PAGE_SIZE = 4;

// `_id` is the final tiebreaker so skip/limit paging is stable - two
// reviews with the same rating (or timestamp) can never swap places between
// requests and show up twice, or not at all, across pages.
const REVIEW_SORT_ORDER: Record<ReviewSort, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  highest: { rating: -1, createdAt: -1, _id: -1 },
  lowest: { rating: 1, createdAt: -1, _id: -1 },
};

/** One page of a product's reviews. An out-of-range `page` is clamped to the
 *  last real page (e.g. after reviews change between requests) rather than
 *  returning an empty page. */
export async function getProductReviewsPage(
  productId: string,
  { page = 1, pageSize = REVIEWS_PAGE_SIZE, sort = "newest" }: { page?: number; pageSize?: number; sort?: ReviewSort } = {}
): Promise<ReviewPage> {
  const empty: ReviewPage = { reviews: [], page: 1, pageSize, total: 0, pageCount: 0, sort };
  if (!isValidObjectId(productId)) {
    return empty;
  }
  await connectDB();

  const total = await Review.countDocuments({ product: productId });
  if (total === 0) {
    return empty;
  }
  const pageCount = Math.ceil(total / pageSize);
  const currentPage = Math.min(Math.max(1, Math.floor(page)), pageCount);

  const reviews = await Review.find({ product: productId })
    .sort(REVIEW_SORT_ORDER[sort])
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize);

  const userIds = [...new Set(reviews.map((review) => review.user.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("name");
  const nameMap = new Map(users.map((user) => [user._id.toString(), user.name]));

  return {
    reviews: reviews.map((review) => toReviewView(review, nameMap.get(review.user.toString()) ?? "A customer")),
    page: currentPage,
    pageSize,
    total,
    pageCount,
    sort,
  };
}

export async function getRatingSummary(productId: string): Promise<RatingSummary> {
  if (!isValidObjectId(productId)) {
    return { average: 0, count: 0 };
  }
  await connectDB();
  const [result] = await Review.aggregate<{ _id: null; average: number; count: number }>([
    { $match: { product: new Types.ObjectId(productId) } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return { average: result?.average ?? 0, count: result?.count ?? 0 };
}

/** How many reviews gave each star rating - index 0 is 5 stars down to
 *  index 4 for 1 star, the order the product page's breakdown bars show. */
export async function getRatingBreakdown(productId: string): Promise<number[]> {
  const counts = [0, 0, 0, 0, 0];
  if (!isValidObjectId(productId)) {
    return counts;
  }
  await connectDB();
  const results = await Review.aggregate<{ _id: number; count: number }>([
    { $match: { product: new Types.ObjectId(productId) } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);
  for (const result of results) {
    if (result._id >= 1 && result._id <= 5) counts[5 - result._id] = result.count;
  }
  return counts;
}

/** Batch version of `getRatingSummary` for listing pages - one query instead of N. */
export async function getRatingSummaries(productIds: string[]): Promise<Map<string, RatingSummary>> {
  const objectIds = productIds.filter((id) => isValidObjectId(id)).map((id) => new Types.ObjectId(id));
  if (objectIds.length === 0) {
    return new Map();
  }

  await connectDB();
  const results = await Review.aggregate<{ _id: Types.ObjectId; average: number; count: number }>([
    { $match: { product: { $in: objectIds } } },
    { $group: { _id: "$product", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  return new Map(results.map((result) => [result._id.toString(), { average: result.average, count: result.count }]));
}

export type UpsertReviewResult = { review: ReviewView } | { error: string };

/** Creates or updates the current user's review for a product - one per customer per product. */
export async function upsertReview(
  userId: string,
  userName: string,
  productId: string,
  input: ReviewInput
): Promise<UpsertReviewResult> {
  if (!isValidObjectId(productId)) {
    return { error: "Product not found" };
  }
  await connectDB();

  const product = await Product.findOne({ _id: productId, isDeleted: false }).select("_id");
  if (!product) {
    return { error: "Product not found" };
  }

  const purchased = await hasPurchasedProduct(userId, productId);
  if (!purchased) {
    return { error: "You can only review products you've purchased." };
  }

  const review = await Review.findOneAndUpdate(
    { product: productId, user: userId },
    { $set: { rating: input.rating, comment: input.comment } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return { review: toReviewView(review, userName) };
}
