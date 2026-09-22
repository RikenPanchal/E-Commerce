"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/**
 * The sticky nav bar's chrome only - a separate client component so it can
 * read scroll position, while `SiteHeader` itself stays a Server Component
 * (it renders `AuthStatus`, an async Server Component, as a child - a
 * Client Component can receive an already-rendered Server Component via
 * `children`, but can never import and render one directly).
 *
 * The homepage hero (`Hero.tsx`) is a plain light section, not a full-bleed
 * photo the header could float transparently over, so there's no
 * transparent/overlay state to offer there. What this still gives every
 * page is a soft, blurred idle state that settles into a fully solid,
 * bordered bar with a light shadow once the visitor actually scrolls - a
 * deliberate, premium micro-interaction instead of a static bar.
 */
export function StickyHeader({ children }: { children: ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300",
        isScrolled
          ? "border-b border-surface-border bg-background/95 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-background/80 backdrop-blur-md"
      )}
    >
      {children}
    </header>
  );
}
