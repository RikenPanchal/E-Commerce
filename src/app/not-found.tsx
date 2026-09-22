import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { buttonVariants } from "@/components/ui/Button";

// A root `not-found.tsx` isn't nested inside the `(shop)` route group's own
// layout (it only matches when nothing else does), so the header/footer are
// rendered directly here rather than inherited - otherwise a broken/old
// link would land on a bare, unbranded page instead of the real site chrome.
// `robots` is set explicitly (even though Next.js also auto-injects its own
// `noindex` for a real 404 response) because without it this segment would
// otherwise inherit the root layout's default `index:true` - producing a
// contradictory pair of robots tags instead of two that agree.
export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist or may have moved.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-24 sm:px-6">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <span className="font-serif text-6xl font-semibold text-rose-500">404</span>
          <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
            We couldn&apos;t find that page
          </h1>
          <p className="text-sm text-foreground/60">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back to
            shopping.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className={buttonVariants({ variant: "burgundy" })}>
              Back to home
            </Link>
            <Link href="/shop" className={buttonVariants({ variant: "outline-burgundy" })}>
              Continue shopping
            </Link>
          </div>
          <Link href="/collections" className="mt-1 text-xs font-medium text-rose-500 underline underline-offset-4">
            Browse collections
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
