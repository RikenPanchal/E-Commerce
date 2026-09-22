import { cn } from "@/components/ui/cn";

/** Generic loading placeholder block - Tailwind's built-in `animate-pulse`
 *  rather than a custom shimmer keyframe, kept deliberately simple. Pass a
 *  height/width/rounding via `className`; defaults suit a line of text. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-foreground/[0.06]", className)} />;
}

/** A handful of skeleton text lines of decreasing width, for paragraph or
 *  multi-line placeholders (a product description, an address block...). */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Loading placeholder shaped like a product card (see `ProductCard`) - for
 *  a shop grid or carousel before real product data has arrived. Matches
 *  that card's own minimal shape: no bordered box around the whole thing,
 *  just an image block and a couple of text lines below it. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Square corners, matching the real card's edge-to-edge photo -
          `rounded-none` overrides the base `Skeleton`'s default rounding. */}
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
