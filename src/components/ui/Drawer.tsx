"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";
import { CloseIcon } from "@/components/home/icons";

/**
 * Edge-anchored sliding panel foundation - used by the mobile nav
 * (MobileNav) and the shop's mobile filter sheet (ShopFilterDrawer). Same
 * open/close behavior as Modal: portal-rendered, Escape + backdrop click +
 * the header's close button to close, scroll-locked while open.
 */
export function Drawer({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Accessible name for the dialog when `title` isn't plain text (e.g. a
   *  logo lockup). Falls back to `title` itself when it is a string. */
  ariaLabel?: string;
  children: ReactNode;
  /** "bottom" is the mobile filter-sheet shape - full width, anchored to
   *  the bottom edge, capped height with its own internal scroll rather
   *  than filling the viewport. */
  side?: "left" | "right" | "bottom";
}) {
  const [mounted, setMounted] = useState(false);
  // The standard client-only-portal pattern: `document.body` doesn't exist
  // during SSR, so this can only become true after mount, on the client -
  // there's no way to know that any earlier than an effect firing once.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex", side === "bottom" && "items-end")}>
      <div
        className="absolute inset-0 animate-drawer-fade bg-black/70 backdrop-blur-[2px] motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
        className={cn(
          "relative flex flex-col border-surface-border bg-surface shadow-xl motion-reduce:animate-none",
          side === "bottom"
            ? "max-h-[85vh] w-full animate-drawer-in-bottom rounded-t-lg border-t pb-[env(safe-area-inset-bottom)]"
            : // Stops short of the full phone width so a strip of the page
              // (and its backdrop) stays visible - a clear "tap outside to
              // close" affordance, and the panel reads as a panel.
              cn(
                "h-full w-[86%] max-w-sm pb-[env(safe-area-inset-bottom)]",
                side === "right" ? "ml-auto animate-drawer-in-right border-l" : "mr-auto animate-drawer-in-left border-r"
              )
        )}
      >
        {title ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border py-3 pr-3 pl-5">
            {typeof title === "string" ? (
              <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
            ) : (
              title
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
