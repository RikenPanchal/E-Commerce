"use client";

import { useState } from "react";
import { ShareIcon, CheckIcon } from "@/components/home/icons";

/** Native share sheet where available (mobile browsers), falling back to
 *  copying the link to the clipboard on desktop - either way the visitor
 *  gets a working "share this" action, not a decorative icon that does
 *  nothing when clicked. */
export function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
      } catch {
        // Cancelled or unsupported mid-flight - no error state needed,
        // the visitor just closed the share sheet.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied - silently do nothing rather than show a
      // broken-looking error for what's a minor convenience action.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this product"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-white text-foreground/60 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600 dark:border-rose-950/40 dark:bg-transparent"
    >
      {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <ShareIcon className="h-4 w-4" />}
    </button>
  );
}
