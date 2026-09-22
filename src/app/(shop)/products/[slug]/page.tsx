import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProductBySlug } from "@/lib/shop/products";
import { getRecommendedProducts, getCompleteTheLookProducts } from "@/lib/shop/recommendations";
import { ProductScroller } from "@/components/home/ProductScroller";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  getProductReviews,
  getRatingSummary,
  getRatingSummaries,
  getUserReviewForProduct,
  hasPurchasedProduct,
} from "@/lib/shop/reviews";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { AddToCartForm } from "@/components/shop/AddToCartForm";
import { StarRating } from "@/components/shop/StarRating";
import { ReviewForm } from "@/components/shop/ReviewForm";
import { ReviewList } from "@/components/shop/ReviewList";
import { ShareButton } from "@/components/shop/ShareButton";
import { StickyBuyBar } from "@/components/shop/StickyBuyBar";
import { ProductCard } from "@/components/shop/ProductCard";
import { TrackRecentlyViewed } from "@/components/recentlyViewed/TrackRecentlyViewed";
import { RecentlyViewedSection } from "@/components/recentlyViewed/RecentlyViewedSection";
import { TruckIcon, CheckIcon, ShieldIcon } from "@/components/home/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema, buildProductSchema } from "@/lib/seo/structuredData";
import { absoluteUrl } from "@/lib/seo/site";
import { truncateForMeta, buildKeywords } from "@/lib/seo/text";

const assurances = [
  { icon: TruckIcon, label: "Free shipping across India" },
  { icon: CheckIcon, label: "All sales are final - no returns" },
  { icon: ShieldIcon, label: "Pay on delivery, no risk" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) {
    return { title: "Product" };
  }

  const seo = product.seo;
  const title = seo?.title || product.name;
  const description = seo?.description || truncateForMeta(product.description);
  const canonicalPath = seo?.canonicalUrl || `/products/${product.slug}`;
  const keywords =
    seo && seo.keywords.length > 0
      ? seo.keywords
      : buildKeywords([product.name, product.category, product.brand, product.material, ...product.tags]);
  const ogTitle = seo?.ogTitle || title;
  const ogDescription = seo?.ogDescription || description;
  const firstImage = product.media.find((item) => item.type === "image");
  const ogImageUrl = seo?.ogImageUrl || firstImage?.url;
  const [index, follow] = (seo?.metaRobots ?? "index,follow").split(",") as ["index" | "noindex", "follow" | "nofollow"];

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: { canonical: canonicalPath },
    robots: { index: index === "index", follow: follow === "follow" },
    openGraph: {
      type: "website",
      title: ogTitle,
      description: ogDescription,
      url: canonicalPath,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [user, rating, reviews] = await Promise.all([
    getCurrentUser(),
    getRatingSummary(product.id),
    getProductReviews(product.id),
  ]);

  const [existingReview, canReview] = user
    ? await Promise.all([
        getUserReviewForProduct(user.id, product.id),
        hasPurchasedProduct(user.id, product.id),
      ])
    : [null, false];

  const completeTheLook = await getCompleteTheLookProducts(product, 6);
  const completeTheLookRatings =
    completeTheLook.length > 0 ? await getRatingSummaries(completeTheLook.map((item) => item.id)) : new Map();

  const related = await getRecommendedProducts(product, [], 4);
  const relatedRatings = await getRatingSummaries(related.map((item) => item.id));

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;
  const isOutOfStock = product.stock <= 0;

  const productUrl = absoluteUrl(product.seo?.canonicalUrl || `/products/${product.slug}`);
  const productImageUrls = product.media.filter((item) => item.type === "image").map((item) => absoluteUrl(item.url));
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: product.category, path: `/shop?category=${encodeURIComponent(product.category)}` },
    { name: product.name },
  ]);
  const productSchema = buildProductSchema({
    product,
    rating,
    reviews,
    url: productUrl,
    imageUrls: productImageUrls,
  });

  return (
    // A soft blush wash behind the whole page instead of stark white - the
    // homepage sections each carry their own color identity now, and this
    // page floating on plain white next to them was a big part of why it
    // read as flat/unfinished by comparison.
    <div className="bg-gradient-to-b from-rose-950/25 via-background to-background">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={productSchema} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-foreground/50">
          <Link href="/" className="hover:text-rose-600">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-rose-600">
            Shop
          </Link>
          <span>/</span>
          <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-rose-600">
            {product.category}
          </Link>
          <span>/</span>
          <span className="truncate text-foreground/70">{product.name}</span>
        </nav>

        {/* The gallery column is capped at a fixed max width (not an even
            50/50 split) so the image itself comes down to a more modest,
            deliberate size instead of ballooning to fill half the page -
            the details column gets the rest, which text needs more of
            anyway. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-10">
          {/* Stays in view while scrolling through description/reviews on
              desktop, instead of scrolling away with everything else - a
              standard modern-PDP touch that keeps the product visible
              alongside whatever detail the visitor is currently reading. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery
              media={product.media}
              name={product.name}
              category={product.category}
              badge={discountPercent > 0 ? `-${discountPercent}%` : undefined}
            />
          </div>

          <div className="flex flex-col gap-4">
            {/* Everything through the buy button lives in one bordered
                card now, instead of loose text and controls floating
                directly on the page background - that lack of a container
                was what made the whole column read as unfinished/plain. */}
            <div className="flex flex-col gap-4 rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-sm dark:border-rose-950/40 dark:bg-transparent dark:shadow-none sm:p-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="w-fit rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                    {product.category}
                  </span>
                  <ShareButton name={product.name} />
                </div>
                <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">{product.name}</h1>
                <StarRating rating={rating.average} count={rating.count} />
              </div>

              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/70">{product.description}</p>

              {/* Small labeled chips instead of a bordered box that looked
                  like a disabled text input - reads as product metadata,
                  not a form field. */}
              {product.brand || product.material ? (
                <div className="flex flex-wrap gap-1.5">
                  {product.brand ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50/50 px-2.5 py-1 text-[11px] font-medium text-foreground dark:border-rose-950/40 dark:bg-transparent">
                      <span className="text-foreground/40">Brand</span>
                      {product.brand}
                    </span>
                  ) : null}
                  {product.material ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50/50 px-2.5 py-1 text-[11px] font-medium text-foreground dark:border-rose-950/40 dark:bg-transparent">
                      <span className="text-foreground/40">Material</span>
                      {product.material}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* Anchor target for the sticky buy bar's "Buy now" - scrolls
                  back to the real size/color picker rather than trying to
                  duplicate that logic in the floating bar. */}
              <div id="buy-box" className="scroll-mt-24">
                <AddToCartForm product={product} />
              </div>
            </div>

            <div className="flex flex-col gap-2.5 rounded-2xl border border-rose-100 bg-white p-3.5 shadow-sm dark:border-rose-950/40 dark:bg-transparent dark:shadow-none">
              {assurances.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs text-foreground/80">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-rose-100 bg-white/70 p-6 shadow-sm dark:border-rose-950/40 dark:bg-transparent dark:shadow-none sm:p-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center gap-5">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-rose-50 px-5 py-3 dark:bg-rose-950/30">
                  <span className="font-serif text-3xl font-bold text-rose-700 dark:text-rose-300">
                    {rating.average.toFixed(1)}
                  </span>
                  <StarRating rating={rating.average} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-serif text-lg font-semibold text-foreground">
                    {rating.count > 0 ? `${rating.count} review${rating.count === 1 ? "" : "s"}` : "No reviews yet"}
                  </span>
                  <span className="text-sm text-foreground/50">
                    {rating.count > 0 ? "See what customers are saying" : "Be the first to share your thoughts"}
                  </span>
                </div>
              </div>
              <ReviewList reviews={reviews} />
            </div>

            <div>
              {canReview ? (
                <ReviewForm slug={product.slug} existingReview={existingReview} />
              ) : user ? (
                <p className="text-sm text-foreground/60">
                  Only customers who&apos;ve purchased this product can leave a review.
                </p>
              ) : (
                <p className="text-sm text-foreground/60">
                  <Link
                    href={`/signin?from=/products/${product.slug}`}
                    className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400"
                  >
                    Sign in
                  </Link>{" "}
                  to write a review after your purchase.
                </p>
              )}
            </div>
          </div>
        </div>

        {completeTheLook.length > 0 ? (
          <div className="mt-16">
            {/* Deliberately a plain, full-bleed section (not the bordered
                white card "You may also like" uses below) - complementary
                picks and similar-product picks need to read as visually
                distinct sections, not the same shelf twice. */}
            <div className="mb-6 flex flex-col gap-1">
              <h2 className="font-serif text-xl font-semibold tracking-[0.02em] text-foreground uppercase sm:text-2xl">
                Complete the Look
              </h2>
              <p className="text-sm text-foreground/60">Pair it with pieces you&apos;ll love.</p>
            </div>
            <ProductScroller
              products={completeTheLook}
              ratings={completeTheLookRatings}
              cardClassName="w-[58%] sm:w-[36%] md:w-[28%] lg:w-[23%]"
              showCardFrame
            />
          </div>
        ) : null}

        {related.length > 0 ? (
          <div className="mt-16 rounded-3xl border border-rose-100 bg-white/70 p-6 shadow-sm dark:border-rose-950/40 dark:bg-transparent dark:shadow-none sm:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="w-fit rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                You may also like
              </span>
              <h2 className="font-serif text-2xl font-bold text-foreground">Similar styles</h2>
              <p className="text-sm text-foreground/60">Similar picks in {product.category}, close to this price</p>
            </div>
            {/* Each item wrapped in its own bordered/shadowed card (not
                bare on this panel's background) so the row reads as a
                shelf of distinct products, matching the same card
                language used across Shop and the homepage. */}
            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} rating={relatedRatings.get(item.id)} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <RecentlyViewedSection excludeProductId={product.id} />

      <TrackRecentlyViewed productId={product.id} />
      <StickyBuyBar product={product} isOutOfStock={isOutOfStock} />
    </div>
  );
}
