import Link from "next/link";
import { BrandMark, CheckIcon, ShieldIcon, TruckIcon } from "@/components/home/icons";
import { cn } from "@/components/ui/cn";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const assurances = [
  { icon: TruckIcon, label: "Free shipping across India" },
  { icon: CheckIcon, label: "All sales are final" },
  { icon: ShieldIcon, label: "100% secure payments via Razorpay" },
];

const legalLinks = [
  { href: "/shipping", label: "Shipping policy" },
  { href: "/returns", label: "Return policy" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms & conditions" },
];

// The one real contact channel that already exists in the codebase (see
// the Terms page's own "Contact us" section) - reused here rather than
// inventing a phone number, live chat, or social links that don't exist
// anywhere in the app.
const SUPPORT_EMAIL = "support@e-commerce.example";

const columnHeadingClass = "text-xs font-semibold tracking-[0.15em] uppercase";

/**
 * `variant="dark"` is the homepage's own premium charcoal footer - deep
 * charcoal background, light type - matching this pass's "the whole site
 * shouldn't stay white" brief. Every other page keeps the original light
 * footer (the default), so this is an opt-in the homepage alone reaches
 * for rather than a change to the shared footer's default appearance.
 */
export async function SiteFooter({ variant = "light" }: { variant?: "light" | "dark" } = {}) {
  const user = await getCurrentUser();
  const isDark = variant === "dark";

  const linkClass = cn(
    "text-sm transition-colors",
    isDark ? "text-white/60 hover:text-white" : "text-foreground/60 hover:text-rose-600"
  );

  return (
    <footer className={cn(isDark ? "bg-burgundy text-foreground" : "border-t border-surface-border bg-background")}>
      <div
        className={cn(
          "mx-auto grid max-w-7xl grid-cols-1 gap-6 border-b px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8",
          isDark ? "border-white/10" : "border-surface-border"
        )}
      >
        {assurances.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-center gap-2.5 sm:justify-start">
            <Icon className={cn("h-5 w-5 shrink-0", isDark ? "text-rose-300" : "text-rose-500")} />
            <span className={cn("text-sm font-medium", isDark ? "text-white/80" : "text-foreground/80")}>{label}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:justify-between lg:gap-16 lg:px-8">
        <div className="flex max-w-xs flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-md", isDark ? "bg-white/10" : "bg-rose-50")}>
              <BrandMark className={cn("h-5 w-5", isDark ? "text-rose-300" : "text-rose-600")} />
            </span>
            <span className="font-serif text-lg font-semibold tracking-[0.02em]">E-Commerce</span>
          </div>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-foreground/60")}>
            Curated women&apos;s fashion, thoughtfully designed for every occasion.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 sm:gap-x-10">
          <div className="flex flex-col gap-3">
            <span className={columnHeadingClass}>Shop</span>
            <Link href="/shop" className={linkClass}>
              All products
            </Link>
            {/* Both sections only exist on the homepage (see
                `NewArrivalsSection`/`CategoryShowcase`'s own `id`s) - a bare
                `#featured`/`#categories` hash only works when already on `/`;
                from anywhere else it just appended the hash to the current
                URL and did nothing. Prefixing with `/` navigates to the
                homepage first, then scrolls to the section, from any page. */}
            <Link href="/#featured" className={linkClass}>
              New arrivals
            </Link>
            <Link href="/#categories" className={linkClass}>
              Categories
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className={columnHeadingClass}>Account</span>
            {user ? (
              <>
                <Link href="/account" className={linkClass}>
                  My account
                </Link>
                <Link href="/orders" className={linkClass}>
                  My orders
                </Link>
                <Link href="/cart" className={linkClass}>
                  My bag
                </Link>
              </>
            ) : (
              <>
                <Link href="/signin" className={linkClass}>
                  Sign in
                </Link>
                <Link href="/signup" className={linkClass}>
                  Create account
                </Link>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className={columnHeadingClass}>Help</span>
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <span className={columnHeadingClass}>Customer care</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={cn(linkClass, "break-all")}>
              {SUPPORT_EMAIL}
            </a>
            <Link href="/orders" className={linkClass}>
              Track an order
            </Link>
          </div>
        </div>
      </div>

      <div className={cn("border-t", isDark ? "border-white/10" : "border-surface-border")}>
        <div
          className={cn(
            "mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6 lg:px-8",
            isDark ? "text-white/50" : "text-muted-foreground"
          )}
        >
          <p>&copy; {new Date().getFullYear()} E-Commerce. All rights reserved.</p>
          <a
            href="#top"
            className={cn(
              "font-medium underline underline-offset-4",
              isDark ? "text-white/70 hover:text-white" : "text-foreground/60 hover:text-rose-600"
            )}
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
