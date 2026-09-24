import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/home/icons";

/**
 * A collapsible filter-sidebar section built on native `<details>` -
 * expand/collapse, keyboard support (Enter/Space on the summary) and
 * screen-reader semantics all come from the browser for free, no JS state
 * needed. `defaultOpen` only sets the *initial* state; the browser then
 * owns it, same as any native disclosure widget.
 */
export function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-t border-surface-border pt-5 first:border-t-0 first:pt-0" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-[0.15em] text-foreground uppercase transition-colors hover:text-rose-400 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronRightIcon className="h-3.5 w-3.5 rotate-90 text-muted-soft transition-transform duration-200 group-open:-rotate-90 group-open:text-rose-400" />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}
