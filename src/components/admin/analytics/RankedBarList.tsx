import { formatCurrency } from "@/lib/utils/currency";

export interface RankedBarItem {
  id: string;
  label: string;
  /** Drives the bar's proportional width, and is what `format` renders. */
  primaryValue: number;
  secondaryText?: string;
}

/**
 * A plain, serializable description of how to render `primaryValue` - never
 * a function, since this can be a Client or Server Component depending on
 * caller but is always fed from a Server Component page, and passing a
 * function prop across that boundary is invalid in React Server Components.
 */
export type RankedBarFormat = "currency" | { unit: string };

function formatPrimaryValue(value: number, format: RankedBarFormat): string {
  if (format === "currency") return formatCurrency(value);
  return `${value} ${format.unit}${value === 1 ? "" : "s"}`;
}

/**
 * The same proportional-bar-list pattern `TopProductsList` already
 * established on `/admin`, generalized for the analytics dashboard's other
 * ranked lists (categories, coupons) - a single rose-colored bar sized
 * relative to the list's own top value. No categorical color is needed
 * here: identity comes from the label text, not a hue, and a ranked list of
 * one metric has nothing for a second color to distinguish.
 */
export function RankedBarList({
  items,
  format,
  emptyMessage,
}: {
  items: RankedBarItem[];
  format: RankedBarFormat;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-foreground/60">{emptyMessage}</p>;
  }

  const maxValue = Math.max(...items.map((item) => item.primaryValue), 1);

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="truncate font-medium text-foreground">{item.label}</span>
            <span className="shrink-0 text-foreground/60">{formatPrimaryValue(item.primaryValue, format)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-rose-500"
              style={{ width: `${(item.primaryValue / maxValue) * 100}%` }}
            />
          </div>
          {item.secondaryText ? <span className="text-xs text-foreground/50">{item.secondaryText}</span> : null}
        </div>
      ))}
    </div>
  );
}
