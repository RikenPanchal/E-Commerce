import type { Metadata } from "next";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { RecentlyViewedProvider } from "@/components/recentlyViewed/RecentlyViewedProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/seo/structuredData";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import "./globals.css";

// Kept under its old CSS variable name (`--font-geist-sans`, read by
// `--font-sans` in globals.css) even though the font itself changed - Inter
// is the clean modern sans the Black + Champagne brief calls for; renaming
// the variable would mean touching every consumer for no visual difference.
const bodySans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The storefront's editorial display face - headings, the wordmark, and
// section titles use this elegant serif for a premium fashion-editorial
// look; body text stays on Inter, a clean modern sans-serif that already
// suits UI copy, so it's kept rather than swapped for its own sake.
const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const DEFAULT_TITLE = `${SITE_NAME} | Women's Fashion`;

export const metadata: Metadata = {
  // Lets every child page's `alternates.canonical`/`openGraph.images` use a
  // site-relative path (e.g. `/products/my-dress`) and still resolve to a
  // real absolute URL - one place to point at the real production domain
  // (NEXT_PUBLIC_SITE_URL) instead of hardcoding it into every page.
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // The real, permanent default - individual private pages (cart, account,
  // admin, etc.) override this with their own `noindex`.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Passed down so the cart can be scoped to whoever is actually signed in -
  // otherwise it's just shared browser storage that leaks between accounts.
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      // `dark` is permanent, not a toggle - see the `@custom-variant dark`
      // note in globals.css. The Black + Champagne theme is the only theme.
      className={`dark ${bodySans.variable} ${geistMono.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={buildOrganizationSchema()} />
        <JsonLd data={buildWebsiteSchema()} />
        <ToastProvider>
          <CartProvider userId={user?.id ?? null}>
            <WishlistProvider userId={user?.id ?? null}>
              <RecentlyViewedProvider userId={user?.id ?? null}>{children}</RecentlyViewedProvider>
            </WishlistProvider>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
