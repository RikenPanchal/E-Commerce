"use client";

import { useEffect, useRef, useState } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Tracks which dialogs are currently open, in open-order, across every
// `useAccessibleDialog` instance on the page - so that when one dialog opens
// another (e.g. Size Guide opened from inside Quick View), Escape closes
// only the topmost one instead of both at once (each instance registers its
// own "keydown" listener, and without this they'd all react to the same
// Escape press).
const openDialogStack: symbol[] = [];

/**
 * Shared plumbing for a portal-based dialog/sheet: a client-only-portal
 * guard, Escape-to-close (topmost dialog only, see `openDialogStack` above),
 * a real focus trap (Tab/Shift+Tab cycling within the dialog, starting from
 * its first focusable element), a body-scroll lock while open, and
 * focus-return to whatever triggered it on close. Extracted so
 * `QuickViewModal`, `QuickAddSheet`, and `SizeGuideModal` share one
 * implementation instead of each carrying its own copy.
 */
export function useAccessibleDialog<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<T>(null);
  const triggerFocusRef = useRef<HTMLElement | null>(null);
  const [id] = useState(() => Symbol("dialog"));

  // The standard client-only-portal pattern: `document.body` doesn't exist
  // during SSR, so this can only become true after mount, on the client -
  // there's no way to know that any earlier than an effect firing once.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    openDialogStack.push(id);
    triggerFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Only the topmost (most-recently-opened) dialog responds, so
        // dismissing a dialog opened from within another (Size Guide inside
        // Quick View, say) doesn't also close the one underneath it.
        if (openDialogStack[openDialogStack.length - 1] !== id) return;
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = openDialogStack.indexOf(id);
      if (index !== -1) openDialogStack.splice(index, 1);
      document.body.style.overflow = previousOverflow;
      triggerFocusRef.current?.focus();
    };
  }, [open, onClose, id]);

  return { mounted, dialogRef };
}
