import type { HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger" | "outline";

/** Small rectangular label - deliberately not a rounded-full "pill" (see
 *  the design-system rule against giant pill shapes), just enough rounding
 *  to feel soft, a thin tinted border, and a subtly tinted background
 *  instead of a solid saturated fill. Used for status/category/count tags. */
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  // `bg-soft`, not `bg-background` - a badge sitting on the page's own
  // background color would be invisible except for its border; the soft
  // neutral gives it a hint of real contrast without reaching for color.
  neutral: "border-surface-border bg-soft text-foreground/70",
  accent: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  outline: "border-surface-border bg-transparent text-foreground/70",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
