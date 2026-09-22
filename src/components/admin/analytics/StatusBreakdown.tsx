import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { StatusBreakdownEntry } from "@/lib/admin/analytics";

export function StatusBreakdown({ breakdown }: { breakdown: StatusBreakdownEntry[] }) {
  const total = breakdown.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return <p className="text-sm text-foreground/60">No orders yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {breakdown.map((entry) => (
        <div key={entry.status} className="flex items-center justify-between gap-4">
          <OrderStatusBadge status={entry.status} />
          <span className="text-sm font-medium text-foreground">{entry.count}</span>
        </div>
      ))}
    </div>
  );
}
