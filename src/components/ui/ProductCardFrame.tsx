import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";

/**
 * Foundation pieces for an image-first card, styled to match the real
 * `ProductCard` (src/components/shop/ProductCard.tsx): no bordered/shadowed
 * box around the whole thing, a large sharp-cornered photo, plain text
 * below it. Not wired into `ProductCard` itself (which has its own
 * business logic), but usable as-is for other image-led cards (an
 * editorial/category tile, for instance). Kept as small composable pieces
 * (frame / image / body) rather than one rigid component.
 */
export function ProductCardFrame({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group block", className)}>
      {children}
    </Link>
  );
}

/** Aspect-locked image slot with a slow, subtle zoom on hover (driven by
 *  the parent `ProductCardFrame`'s `group` class) - pass a plain `<img>`
 *  or the existing `ProductImage` component as `children`. Square corners
 *  on purpose - editorial photography doesn't get rounded off. */
export function ProductCardImageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative aspect-[4/5] w-full overflow-hidden bg-background", className)}>
      <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105 [&>img]:h-full [&>img]:w-full [&>img]:object-cover">
        {children}
      </div>
    </div>
  );
}

export function ProductCardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-1 pt-3", className)}>{children}</div>;
}
