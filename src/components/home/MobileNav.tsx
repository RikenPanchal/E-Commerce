"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { MenuIcon } from "@/components/home/icons";

const links = [
  { href: "/#featured", label: "New Arrivals" },
  { href: "/shop", label: "Shop" },
  { href: "/#categories", label: "Categories" },
  { href: "/collections", label: "Collections" },
  { href: "/#trending", label: "Trending" },
];

/**
 * Below `lg`, `SiteHeader`'s inline nav links are hidden with no
 * replacement - this is what stands in for them on phones and tablets: a
 * toggle button that opens a slide-in panel (the shared `Drawer`
 * foundation) with the same nav links. Search isn't duplicated here -
 * `SmartSearch`'s own icon in the header's utility cluster is visible at
 * every width and already opens its own full-screen search experience on
 * small screens, so there's exactly one search entry point, not two.
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);

  // Close the panel automatically on navigation so it never stays open over
  // the next page. This adjusts state in response to a value changing
  // between renders, so it belongs during render (guarded by the state
  // comparison) rather than in an effect - see "Adjusting state when a prop
  // changes" in the React docs. Refs can't be read during render, so the
  // previous value is tracked in state instead.
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    if (isOpen) {
      setIsOpen(false);
    }
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <Drawer open={isOpen} onClose={() => setIsOpen(false)} title="Menu">
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Drawer>
    </div>
  );
}
