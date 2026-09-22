import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/**
 * The editorial section header pattern: a small tracked-out "eyebrow"
 * label with a short accent rule, a serif heading beneath it, and an
 * optional supporting line - the shape most premium fashion sites use to
 * introduce a homepage section, a category row, or a page. `action` is an
 * optional slot for a trailing "View all" link, right-aligned next to the
 * heading on wide screens.
 *
 * `size="display"` is the dramatically large treatment - a huge, tight-
 * leading serif headline (think a magazine cover line, e.g. "NEW" stacked
 * over "ARRIVALS") rather than a conventional section title. Existing call
 * sites are unaffected (`size` defaults to the original scale); this is
 * here for pages that want to adopt the bigger, more editorial moment.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  size = "default",
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  size?: "default" | "display";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className
      )}
    >
      <div className={cn("max-w-2xl", size === "display" && "max-w-none", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <p
            className={cn(
              "mb-2 flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-rose-600 uppercase",
              align === "center" && "justify-center"
            )}
          >
            <span className="h-px w-6 bg-rose-400" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-serif font-semibold text-foreground",
            size === "display"
              ? "text-6xl leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl"
              : "text-3xl sm:text-4xl"
          )}
        >
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
