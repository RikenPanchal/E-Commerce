"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";

/**
 * Edge-anchored sliding panel foundation - the shape a future cart drawer,
 * filter panel, or mobile nav could use. Not wired into the current mobile
 * menu (SiteHeader) or cart (a full page, CartView) yet. Same open/close
 * behavior as Modal: portal-rendered, Escape + backdrop click to close,
 * scroll-locked while open.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
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
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "relative flex flex-col bg-surface shadow-xl",
          side === "bottom"
            ? "max-h-[85vh] w-full rounded-t-lg"
            : cn("h-full w-full max-w-sm", side === "right" ? "ml-auto" : "mr-auto")
        )}
      >
        {title ? (
          <div className="border-b border-surface-border px-6 py-4">
            <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
