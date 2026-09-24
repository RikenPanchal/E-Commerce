function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A fixed, always-visible "back to top" pill in the bottom-right corner -
 * matches Nykaa Fashion's own floating button exactly (confirmed from a
 * real screenshot). Plain `<a href="#top">` is enough: `scroll-behavior:
 * smooth` in globals.css and SiteHeader's `id="top"` do the rest, no JS
 * needed.
 */
export function BackToTopButton() {
  return (
    <a
      href="#top"
      aria-label="Back to top"
      // Lifts above StickyBuyBar (which sets data-sticky-buy-bar on <body>)
      // so it never covers that bar's Buy button on small screens.
      className="fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-md border border-black/10 bg-surface text-foreground shadow-lg transition-all hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10 [body[data-sticky-buy-bar]_&]:bottom-24"
    >
      <ArrowUpIcon />
    </a>
  );
}
