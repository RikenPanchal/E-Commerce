import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { SiteHeader } from "@/components/home/SiteHeader";
import { CategoryRail } from "@/components/home/CategoryRail";
import { Hero } from "@/components/home/Hero";
import { TopSellingProducts } from "@/components/home/TopSellingProducts";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { EditorialFeature } from "@/components/home/EditorialFeature";
import { TrendingNow } from "@/components/home/TrendingNow";
import { CollectionsSection } from "@/components/home/CollectionsSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { RecentlyViewedSection } from "@/components/recentlyViewed/RecentlyViewedSection";
import { PickedForYouSection } from "@/components/recentlyViewed/PickedForYouSection";
import { TrustAndCTA } from "@/components/home/TrustAndCTA";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTopButton } from "@/components/home/BackToTopButton";

// The fixed, final homepage structure: Announcement + Header (inside
// `SiteHeader`) -> Category Navigation Rail -> Hero -> Best Sellers -> Shop
// by Category -> New Season (`EditorialFeature`) -> Shop by Collection
// (`CollectionsSection`, real admin-curated collections) -> Trending Now ->
// New Arrivals (`FeaturedProducts`) -> Recently Viewed -> Picked for You
// (`PickedForYouSection`, recommendations *similar to* recently viewed
// products, not a duplicate of that list) - both render nothing until
// there's real browsing history -> Trust + CTA -> Footer. Section order
// and purpose are intentionally not up for reinterpretation here.
//
// Best Sellers, Trending Now, New Arrivals, Shop by Collection, Recently
// Viewed and Picked for You are the six "editorial discovery" sections -
// each has its own card design and layout on purpose (see each component's
// own doc comment), not the same product grid repeated six times.
// `CollectionsSection` alone renders nothing when there are no active
// collections yet, same as `FeaturedProducts`/`TrendingNow` do for their
// own empty-data case.
export default async function Home() {
  // Signed-in admins land in the dashboard, not the storefront landing page.
  // Everyone else (signed out, or a regular customer) sees it as normal.
  const user = await getCurrentUser();
  if (user?.role === "admin") {
    redirect("/admin");
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader announcementVariant="dark" />
      <CategoryRail />
      <Hero />
      <TopSellingProducts />
      <CategoryShowcase />
      <EditorialFeature />
      <CollectionsSection />
      <TrendingNow />
      <FeaturedProducts />
      <RecentlyViewedSection
        title="Still on Your Mind?"
        description="The styles you checked out are waiting for you."
        variant="compact"
      />
      <PickedForYouSection />
      <TrustAndCTA />
      <SiteFooter variant="dark" />
      <BackToTopButton />
    </div>
  );
}
