/** Same threshold the product page's "Only X left in stock" badge already
 *  uses - kept here as the one shared definition so "low stock" means the
 *  same thing everywhere (customer-facing badge, admin filter) rather than
 *  each place guessing its own number. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "out" | "low" | "in";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}
