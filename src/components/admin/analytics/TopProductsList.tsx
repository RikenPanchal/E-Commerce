import { formatCurrency } from "@/lib/utils/currency";
import type { TopProduct } from "@/lib/admin/analytics";

export function TopProductsList({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-foreground/60">No sales yet.</p>;
  }

  const maxRevenue = Math.max(...products.map((product) => product.revenue), 1);

  return (
    <div className="flex flex-col gap-4">
      {products.map((product) => (
        <div key={product.productId} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="truncate font-medium text-foreground">{product.name}</span>
            <span className="shrink-0 text-foreground/60">{formatCurrency(product.revenue)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-rose-500"
              style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
            />
          </div>
          <span className="text-xs text-foreground/50">
            {product.quantitySold} sold
          </span>
        </div>
      ))}
    </div>
  );
}
