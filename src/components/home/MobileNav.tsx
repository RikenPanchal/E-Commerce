"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { BrandMark, ChevronRightIcon, HeartIcon, MenuIcon, TruckIcon } from "@/components/home/icons";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";
import { cn } from "@/components/ui/cn";

const links = [
  { href: "/#featured", label: "New Arrivals" },
  { href: "/shop", label: "Shop" },
  { href: "/#categories", label: "Categories" },
  { href: "/collections", label: "Collections" },
  { href: "/#trending", label: "Trending" },
];

export interface MobileNavUser {
  name: string;
  email: string;
  isAdmin: boolean;
}

/** Real routes only get an "active" state - the in-page `/#...` anchors
 *  all live on the homepage, so none of them is ever the current page. */
function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{children}</p>;
}

/**
 * Below `lg`, `SiteHeader`'s inline nav links are hidden with no
 * replacement - this is what stands in for them on phones and tablets: a
 * toggle button that opens a slide-in panel (the shared `Drawer`
 * foundation) with the nav links, category shortcuts and account links.
 * Search isn't duplicated here - `SmartSearch`'s own icon in the header's
 * utility cluster is visible at every width and already opens its own
 * full-screen search experience on small screens, so there's exactly one
 * search entry point, not two.
 */
export function MobileNav({ user }: { user: MobileNavUser | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);
  const close = () => setIsOpen(false);

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

  const accountLinks = user
    ? user.isAdmin
      ? [
          { href: "/admin", label: "Admin dashboard" },
          { href: "/wishlist", label: "Wishlist" },
        ]
      : [
          { href: "/account", label: "My account" },
          { href: "/orders", label: "My orders" },
          { href: "/wishlist", label: "Wishlist" },
        ]
    : [];

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <Drawer
        open={isOpen}
        onClose={close}
        side="left"
        ariaLabel="Menu"
        title={
          <Link href="/" onClick={close} className="flex min-w-0 items-center gap-2">
            <BrandMark className="h-6 w-6 shrink-0 text-rose-500" />
            <span className="truncate font-serif text-lg font-semibold tracking-[0.1em] text-foreground">E-Commerce</span>
          </Link>
        }
      >
        {user ? (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-surface-border bg-background/60 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-semibold text-background">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">Hi, {user.name.split(" ")[0]}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        ) : null}

        <nav aria-label="Main" className="-mx-2 flex flex-col">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center justify-between rounded-md border-l-2 px-3 py-3 text-[15px] font-medium transition-colors",
                  active
                    ? "border-rose-400 bg-rose-400/10 text-rose-300"
                    : "border-transparent text-foreground/85 hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                {link.label}
                <ChevronRightIcon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                    active ? "text-rose-300" : "text-foreground/30"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-surface-border pt-5">
          <SectionLabel>Shop by category</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCT_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/shop?categories=${encodeURIComponent(category)}`}
                onClick={close}
                className="flex items-center justify-center rounded-md border border-surface-border px-3 py-2.5 text-center text-[13px] leading-tight text-foreground/80 transition-colors hover:border-rose-400/60 hover:text-rose-300"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-surface-border pt-5">
          <SectionLabel>{user ? "Your account" : "Account"}</SectionLabel>
          {user ? (
            <div className="-mx-2 flex flex-col">
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isActive(pathname, link.href)
                      ? "text-rose-300"
                      : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
                  )}
                >
                  {link.href === "/wishlist" ? <HeartIcon className="h-4 w-4 shrink-0" /> : null}
                  {link.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/signin"
                onClick={close}
                className="rounded-md bg-foreground px-4 py-2.5 text-center text-sm font-medium tracking-wide text-background transition-colors hover:bg-foreground/85"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={close}
                className="rounded-md border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
              >
                Create account
              </Link>
              <Link
                href="/wishlist"
                onClick={close}
                className="mt-1 flex items-center justify-center gap-2 py-1.5 text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                <HeartIcon className="h-4 w-4 shrink-0" />
                Wishlist
              </Link>
            </div>
          )}
        </div>

        {/* Grows to pin the footer to the bottom of the (flex-column) drawer
            body on tall screens; keeps a minimum gap when the content is
            long enough to scroll. */}
        <div className="min-h-6 flex-1" aria-hidden="true" />
        <div className="flex flex-col gap-3 border-t border-surface-border pt-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <TruckIcon className="h-4 w-4 shrink-0 text-rose-400" />
            Free shipping across India
          </p>
          {user ? (
            <SignOutButton className="w-fit text-sm font-medium text-red-400 no-underline transition-colors hover:text-red-300" />
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
