import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connectDB";
import BackInStockSubscription from "@/models/BackInStockSubscription";
import Product from "@/models/Product";

export interface BackInStockOverviewRow {
  productId: string;
  productName: string;
  productSlug: string;
  variantId?: string;
  size?: string;
  color?: string;
  activeCount: number;
  notifiedCount: number;
  oldestActiveAt?: string;
}

interface GroupResult {
  _id: { product: Types.ObjectId; variantId: Types.ObjectId | null };
  activeCount: number;
  notifiedCount: number;
  oldestActiveAt: Date | null;
}

/**
 * Counts only, grouped by exact product + variant - never the individual
 * subscriber emails behind them. This app has a single admin role tier, but
 * the data-minimization principle still applies: an admin managing
 * inventory needs "how many people are waiting for Black/M", not a mailing
 * list, so this is the one thing exposed here.
 */
export async function getBackInStockOverview(): Promise<BackInStockOverviewRow[]> {
  await connectDB();

  const grouped = await BackInStockSubscription.aggregate<GroupResult>([
    { $match: { status: { $in: ["active", "notified"] } } },
    {
      $group: {
        _id: { product: "$product", variantId: "$variantId" },
        activeCount: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        notifiedCount: { $sum: { $cond: [{ $eq: ["$status", "notified"] }, 1, 0] } },
        oldestActiveAt: { $min: { $cond: [{ $eq: ["$status", "active"] }, "$createdAt", null] } },
      },
    },
    { $sort: { activeCount: -1, notifiedCount: -1 } },
  ]);

  if (grouped.length === 0) return [];

  const productIds = [...new Set(grouped.map((group) => group._id.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const rows: BackInStockOverviewRow[] = [];
  for (const group of grouped) {
    const product = productMap.get(group._id.product.toString());
    if (!product) continue; // Deleted since - nothing meaningful left to show for it.
    const variant = group._id.variantId
      ? product.variants.find((item) => item._id.toString() === group._id.variantId?.toString())
      : undefined;
    rows.push({
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.slug,
      variantId: variant?._id.toString(),
      size: variant?.size,
      color: variant?.color,
      activeCount: group.activeCount,
      notifiedCount: group.notifiedCount,
      oldestActiveAt: group.oldestActiveAt ? group.oldestActiveAt.toISOString() : undefined,
    });
  }
  return rows;
}
