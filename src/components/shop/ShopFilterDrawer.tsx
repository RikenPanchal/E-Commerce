"use client";

import { useState, type ReactNode } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FilterIcon } from "@/components/home/icons";
import { cn } from "@/components/ui/cn";

/**
 * Mobile-only trigger for the filter form - the exact same server-rendered
 * form markup the desktop sidebar shows (passed in as `children` from the
 * Shop page, a Server Component, so there is exactly one definition of the
 * filter form, never a second copy that could drift out of sync). Applying
 * a filter submits that real GET form and navigates, which naturally
 * unmounts this component - so there's no "close after submit" to wire up,
 * the drawer simply isn't there anymore once the new page renders.
 */
export function ShopFilterDrawer({ children, activeCount }: { children: ReactNode; activeCount: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex-1 lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-surface-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-rose-800/40"
      >
        <FilterIcon className="h-4 w-4 text-rose-400" />
        Filters
        {activeCount > 0 ? (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-800 px-1 text-[11px] font-semibold text-background"
            )}
          >
            {activeCount}
          </span>
        ) : null}
      </button>

      <Drawer open={isOpen} onClose={() => setIsOpen(false)} side="bottom" title="Filters">
        <div className="flex flex-col gap-6 pb-4">{children}</div>
      </Drawer>
    </div>
  );
}
