import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { CartLink } from "@/components/cart/CartLink";
import { WishlistLink } from "@/components/wishlist/WishlistLink";
import { SmartSearch } from "@/components/search/SmartSearch";
import { BrandMark } from "@/components/home/icons";
import { MobileNav } from "@/components/home/MobileNav";
import { StickyHeader } from "@/components/home/StickyHeader";

const navLinks = [
  { href: "/#featured", label: "New Arrivals" },
  { href: "/shop", label: "Shop" },
  { href: "/#categories", label: "Categories" },
  { href: "/collections", label: "Collections" },
  { href: "/#trending", label: "Trending" },
];

/**
 * `announcementVariant="dark"` is the homepage's own dark charcoal
 * announcement strip - every other page keeps the original light strip
 * (the default), so this is an opt-in the homepage alone reaches for
 * rather than a change to the shared header's default appearance. The
 * copy itself is unchanged either way - real, existing information
 * (shipping/returns), not an invented seasonal slogan.
 */
export function SiteHeader({ announcementVariant = "light" }: { announcementVariant?: "light" | "dark" } = {}) {
  const isDarkAnnouncement = announcementVariant === "dark";

  return (
    <>
      {/* Scrolls away with the page; only the nav bar below stays sticky.
          The id is the footer's "Back to top" anchor target. */}
      <div
        id="top"
        className={cn(
          "border-b py-2 text-center text-xs font-medium tracking-wide",
          isDarkAnnouncement ? "border-white/10 bg-foreground text-white/80" : "border-surface-border bg-background text-muted-foreground"
        )}
      >
        <p>Free shipping across India &nbsp;&middot;&nbsp; All sales are final</p>
      </div>

      <StickyHeader>
        {/* Three explicit columns rather than an absolutely-centered logo -
            the nav is centered against the *whole row*, independent of how
            wide the logo or the search/account/cart cluster happen to be,
            which is the classic premium fashion-site layout the brief asks
            for (logo left, nav centered, utilities right). `minmax(0, 1fr)`
            on the outer columns stops either cluster's content from
            forcing the grid wider than the viewport at narrower desktop
            widths (1024-1279px). */}
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-4 sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1 justify-self-start sm:gap-2">
            <MobileNav />
            <Link href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <BrandMark className="h-6 w-6 shrink-0 text-rose-500" />
              <span className="hidden truncate font-serif text-lg font-semibold tracking-[0.1em] text-foreground sm:inline">
                E-Commerce
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-4 text-sm font-medium text-foreground/70 lg:flex xl:gap-7">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="group relative py-1 transition-colors hover:text-foreground">
                {link.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-rose-500 transition-transform duration-200 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 justify-self-end sm:gap-2">
            <SmartSearch />
            <AuthStatus />
            <WishlistLink />
            <CartLink />
          </div>
        </div>
      </StickyHeader>
    </>
  );
}
