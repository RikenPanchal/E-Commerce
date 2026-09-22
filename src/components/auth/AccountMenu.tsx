"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Replaces the old row of separate "Account" / "My orders" / "Sign out"
 * text links with a single name-triggered dropdown - a lot less clutter in
 * an already-busy header, and a more deliberate, styled account entry point.
 */
export function AccountMenu({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 sm:pr-3"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-semibold text-background">
          {initial}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{firstName}</span>
        <ChevronIcon open={isOpen} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-surface-border bg-surface py-1.5 shadow-lg"
        >
          <div className="border-b border-surface-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>

          <div className="flex flex-col py-1">
            <Link
              href={isAdmin ? "/admin" : "/account"}
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-rose-50 hover:text-rose-700"
              role="menuitem"
            >
              {isAdmin ? "Admin dashboard" : "My account"}
            </Link>
            {!isAdmin ? (
              <Link
                href="/orders"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-rose-50 hover:text-rose-700"
                role="menuitem"
              >
                My orders
              </Link>
            ) : null}
          </div>

          <div className="border-t border-surface-border pt-1">
            <SignOutButton className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 no-underline transition-colors hover:bg-red-50" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
