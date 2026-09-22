import type { SVGProps } from "react";
import { getFeaturedPublicProducts } from "@/lib/shop/products";
import { ProductImage } from "@/components/shop/ProductImage";

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M5 12.5 9.5 17 19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const highlights = [
  "New arrivals added every week",
  "Free shipping across India",
  "All sales are final - no returns or exchanges",
];

// White/near-white panel with a thin border, not a colored gradient fill -
// the accent lives only in the wordmark, checkmarks and a couple of words.
// The lower half fills the panel's remaining height with one real catalog
// photo (same `getFeaturedPublicProducts` call the homepage uses) instead of
// being left as dead space - a photo, never a color wash, so the "no
// gradient fill" intent above still holds.
export async function AuthBrandPanel() {
  const [featured] = await getFeaturedPublicProducts(1);

  return (
    <div className="relative hidden flex-col border-r border-black/10 bg-surface p-10 dark:border-white/15 lg:flex">
      <span className="font-serif text-base font-semibold tracking-[0.15em] text-rose-600 dark:text-rose-300">
        E-Commerce
      </span>

      <div className="mt-10 flex flex-col gap-4">
        <h2 className="max-w-sm font-serif text-4xl font-bold leading-tight text-foreground">
          Elevate your everyday wardrobe
        </h2>
        <p className="max-w-sm text-foreground/60">
          Curated women&apos;s fashion, thoughtfully designed for every occasion.
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {highlights.map((highlight) => (
            <li key={highlight} className="flex items-center gap-2.5 text-sm text-foreground/70">
              <CheckIcon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" />
              {highlight}
            </li>
          ))}
        </ul>
      </div>

      {featured ? (
        <div className="relative mt-8 min-h-0 flex-1 overflow-hidden rounded-2xl">
          <ProductImage
            media={featured.media}
            name={featured.name}
            category={featured.category}
            className="h-full w-full"
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <p className="mt-8 text-xs text-foreground/40">
        &copy; {new Date().getFullYear()} E-Commerce. All rights reserved.
      </p>
    </div>
  );
}
