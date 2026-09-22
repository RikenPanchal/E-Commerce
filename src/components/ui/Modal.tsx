"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

/**
 * Centered dialog foundation - not wired into any existing flow yet (there
 * is no current modal to migrate; `ProductDetailModal` and the admin/auth
 * flows keep their own bespoke markup for now). Renders via a portal so it
 * is never clipped by an ancestor's `overflow`/`transform`, closes on
 * Escape and on backdrop click, and locks page scroll while open.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          "relative w-full rounded-lg border border-surface-border bg-surface p-6 shadow-xl",
          SIZE_CLASSES[size]
        )}
      >
        {title ? <h2 className="mb-4 font-serif text-xl font-semibold text-foreground">{title}</h2> : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
