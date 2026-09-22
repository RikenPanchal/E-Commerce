"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/**
 * Fades and slides a section's content up into place the first time it
 * scrolls into view - a single shared primitive so every homepage section
 * gets the same restrained entrance instead of each one inventing its own.
 * A Server Component can render this directly and pass its own
 * server-rendered JSX in as `children` (only the reverse - a Client
 * Component importing a Server Component - is disallowed), which is why
 * every section below can stay an async Server Component and still use
 * this. Respects `prefers-reduced-motion` by simply skipping the animation.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Reduced-motion visitors start already "visible" - read once, lazily, as
  // the initial state itself rather than via a same-render `setState` call
  // inside the effect below (which would trigger an avoidable extra render).
  const [isVisible, setIsVisible] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const el = ref.current;
    // Reduced-motion was already handled by the lazy initial state above;
    // checking it again here (rather than reading `isVisible`) keeps this
    // effect's dependency array honestly empty - it only ever needs to run
    // once, and only ever calls `setIsVisible` from the observer's own
    // callback, not synchronously from the effect body.
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: isVisible ? `${delayMs}ms` : "0ms" }}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
