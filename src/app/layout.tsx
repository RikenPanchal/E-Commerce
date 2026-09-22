import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { RecentlyViewedProvider } from "@/components/recentlyViewed/RecentlyViewedProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The storefront's editorial display face - headings, the wordmark, and
// section titles use this elegant serif for a premium fashion-editorial
// look; body text stays on Geist Sans, a clean modern sans-serif that
// already suits UI copy, so it's kept rather than swapped for its own sake.
const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "E-Commerce | Women's Fashion",
    template: "%s | E-Commerce",
  },
  description:
    "Curated women's fashion, thoughtfully designed for every occasion.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Passed down so the cart can be scoped to whoever is actually signed in -
  // otherwise it's just shared browser storage that leaks between accounts.
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
