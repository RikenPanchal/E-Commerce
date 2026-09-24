import { Skeleton, ProductCardSkeleton } from "@/components/ui/Skeleton";

/**
 * Next.js shows this automatically while the Shop page's server-rendered
 * first page is being fetched - any full navigation to /shop, including a
 * new search/filter/sort submission (a plain GET form navigation, not a
 * client-side fetch), briefly re-renders this route segment. Purely a
 * loading placeholder shaped like the real layout below - no filter/
 * search/sort logic lives here.
 */
export default function ShopLoading() {
  return (
    <div className="flex flex-col">
      <div className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <div className="border-b border-surface-border bg-background">
        <div className="mx-auto flex max-w-[820px] flex-col items-center gap-3 px-4 py-8 sm:py-10">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      <div className="border-b border-surface-border bg-surface">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-hidden px-4 py-3 sm:px-6 lg:px-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-16 shrink-0" />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="hidden flex-col gap-6 lg:flex">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
