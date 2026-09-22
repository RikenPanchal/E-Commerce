import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCollectionBySlug, getCollectionProducts } from "@/lib/shop/collections";
import { getRatingSummaries } from "@/lib/shop/reviews";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductImage } from "@/components/shop/ProductImage";
import { StarRating } from "@/components/shop/StarRating";
import { buttonVariants } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/currency";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema, buildCollectionPageSchema } from "@/lib/seo/structuredData";
import { absoluteUrl } from "@/lib/seo/site";
import { truncateForMeta } from "@/lib/seo/text";

// Below this many pieces, a "hero look + grid" split reads as unbalanced
// (a single lonely card sitting under a big feature photo) - small edits
// get one generous, evenly-spaced row instead; this is the count at which
// there's enough left over to fill a real grid underneath the hero.
const HERO_MIN_PRODUCTS = 5;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug, true);
  if (!collection) {
    return { title: "Collection" };
  }

  const seo = collection.seo;
  const title = seo?.title || collection.name;
  const description =
    seo?.description || (collection.description ? truncateForMeta(collection.description) : undefined);
  const canonicalPath = seo?.canonicalUrl || `/collections/${collection.slug}`;
  const ogTitle = seo?.ogTitle || title;
  const ogDescription = seo?.ogDescription || description;
  const ogImageUrl = seo?.ogImageUrl || collection.image?.url;
  const [index, follow] = (seo?.metaRobots ?? "index,follow").split(",") as ["index" | "noindex", "follow" | "nofollow"];

  return {
    title,
    description,
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

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // An admin may open an inactive collection to preview it before switching
  // it on (the "Preview" action on the edit page links straight here); every
  // other visitor sees an inactive collection exactly as if it didn't exist.
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const collection = await getCollectionBySlug(slug, isAdmin);

  if (!collection) {
    notFound();
  }

  const products = await getCollectionProducts(collection);
  const ratings = products.length > 0 ? await getRatingSummaries(products.map((product) => product.id)) : new Map();

  // A real photo behind the name/description either way - the admin's own
  // collection image if they set one, or (never a flat placeholder color)
  // the first real product's photo otherwise, so an edit never looks
  // unfinished just because nobody uploaded a banner for it yet.
  const firstProductPhoto = products[0]?.media.find((item) => item.type === "image");
  const bannerImage = collection.image ?? (firstProductPhoto ? { url: firstProductPhoto.url } : undefined);

  const useHeroLayout = products.length >= HERO_MIN_PRODUCTS;
  const heroProduct = useHeroLayout ? products[0] : undefined;
  const gridProducts = useHeroLayout ? products.slice(1) : products;
  const heroRating = heroProduct ? ratings.get(heroProduct.id) : undefined;
  const heroDiscount =
    heroProduct?.compareAtPrice && heroProduct.compareAtPrice > heroProduct.price
      ? Math.round(((heroProduct.compareAtPrice - heroProduct.price) / heroProduct.compareAtPrice) * 100)
      : 0;

  const collectionUrl = absoluteUrl(collection.seo?.canonicalUrl || `/collections/${collection.slug}`);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: collection.name },
  ]);
  const collectionSchema = buildCollectionPageSchema({
    collection,
    productUrls: products.map((product) => ({ name: product.name, url: absoluteUrl(`/products/${product.slug}`) })),
    url: collectionUrl,
  });

  return (
    <div className="flex flex-col">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={collectionSchema} />
      {!collection.isActive ? (
        <div className="bg-burgundy py-2 text-center text-xs font-medium text-foreground">
          Inactive - only visible to admins as a preview
        </div>
      ) : null}

      <div className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-muted-soft uppercase"
          >
            <Link href="/" className="transition-colors hover:text-rose-800">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/collections" className="transition-colors hover:text-rose-800">
              Collections
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-rose-800">{collection.name}</span>
          </nav>
        </div>
      </div>

      {/* Banner - a real photo behind the name/description (the collection's
          own image, or its first product's, never a flat placeholder) -
          the same editorial tone as the Shop page's intro. */}
      <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-sand py-16 text-center sm:py-24">
        {bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        {bannerImage ? <div className="absolute inset-0 bg-black/50" aria-hidden="true" /> : null}
        <div className="relative mx-auto max-w-[820px] px-4 sm:px-6">
          <span
            className={`inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase ${
              bannerImage ? "text-rose-300" : "text-rose-800"
            }`}
          >
            <span className="h-px w-6 bg-current opacity-60" aria-hidden="true" />
            Curated edit
            <span className="h-px w-6 bg-current opacity-60" aria-hidden="true" />
          </span>
          <h1
            className={`mt-3 font-serif text-3xl font-semibold sm:text-5xl ${bannerImage ? "text-white" : "text-foreground"}`}
          >
            {collection.name}
          </h1>
          {collection.description ? (
            <p className={`mt-3 text-sm sm:text-base ${bannerImage ? "text-white/85" : "text-muted-foreground"}`}>
              {collection.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center">
            <p className="font-serif text-xl font-semibold text-foreground">No products in this collection yet</p>
            <p className="text-sm text-muted-foreground">Check back soon, or browse the full catalog instead.</p>
            <Link href="/shop" className={buttonVariants({ variant: "burgundy", className: "mt-1" })}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-8 text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
              {products.length} {products.length === 1 ? "piece" : "pieces"} in this edit
            </p>

            {/* One real look given room to breathe before the grid - the
                same "spotlight, then the rest" structure a fashion
                editorial uses to open a collection story, built from the
                collection's own actual first product (its own curated
                order), never a separate "featured" flag. */}
            {heroProduct ? (
              <div className="mb-14 grid gap-6 overflow-hidden rounded-2xl border border-surface-border bg-surface lg:grid-cols-2 lg:gap-0">
                <Link
                  href={`/products/${heroProduct.slug}`}
                  className="group relative block aspect-[4/5] w-full overflow-hidden lg:aspect-auto"
                >
                  <ProductImage
                    media={heroProduct.media}
                    name={heroProduct.name}
                    category={heroProduct.category}
                    className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
                    priority
                  />
                </Link>
                <div className="flex flex-col justify-center gap-3 p-8 sm:p-10">
                  <span className="text-xs font-semibold tracking-[0.2em] text-rose-400 uppercase">This edit&apos;s pick</span>
                  <h2 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">{heroProduct.name}</h2>
                  <StarRating rating={heroRating?.average ?? 0} count={heroRating?.count ?? 0} size="md" />
                  <p className="line-clamp-3 text-sm text-muted-foreground">{heroProduct.description}</p>
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-2xl font-semibold text-foreground">{formatCurrency(heroProduct.price)}</span>
                    {heroDiscount > 0 && heroProduct.compareAtPrice ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(heroProduct.compareAtPrice)}
                        </span>
                        <span className="text-sm font-medium text-rose-400">Save {heroDiscount}%</span>
                      </>
                    ) : null}
                  </div>
                  <Link
                    href={`/products/${heroProduct.slug}`}
                    className={buttonVariants({ variant: "burgundy", size: "lg", className: "mt-2 w-fit" })}
                  >
                    Shop this piece
                  </Link>
                </div>
              </div>
            ) : null}

            {gridProducts.length > 0 ? (
              <div
                className={
                  useHeroLayout
                    ? "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6"
                    : "mx-auto grid max-w-4xl grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {gridProducts.map((product) => (
                  <ProductCard key={product.id} product={product} rating={ratings.get(product.id)} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
