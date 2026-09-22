import Link from "next/link";
import { getFeaturedPublicProducts } from "@/lib/shop/products";
import { ProductImage } from "@/components/shop/ProductImage";
import { buttonVariants } from "@/components/ui/Button";
import { Reveal } from "@/components/home/Reveal";

/**
 * "New Season Collection" - collection information on the left, two real
 * photos arranged on the right (a main image plus a smaller overlapping
 * one), on a warm beige background. Deliberately smaller than the Hero -
 * this is a supporting collection callout, not a second hero. Real catalog
 * photography (the same `getFeaturedPublicProducts` call used elsewhere on
 * the page) - never an invented image.
 */
export async function EditorialFeature() {
  const featured = await getFeaturedPublicProducts(3);
  const primary = featured[1] ?? featured[0];
  const secondary = featured[2] ?? featured[0];

  return (
    <section id="new-season" className="w-full scroll-mt-20 bg-sand">
      <div className="mx-auto max-w-[1380px] px-4 py-14 sm:px-8 sm:py-16 lg:py-0">
        <div className="grid items-center gap-10 lg:h-[460px] lg:grid-cols-2 lg:gap-16">
          <Reveal className="max-w-md">
            <p className="mb-4 flex items-center gap-2 text-xs font-medium tracking-[0.25em] text-rose-600 uppercase">
              <span className="h-px w-8 bg-rose-400" aria-hidden="true" />
              New season
            </p>
            <h2 className="font-serif text-4xl leading-[1.1] font-semibold tracking-tight text-foreground sm:text-5xl">
              Fresh styles.
              <br />
              New energy.
            </h2>
            <p className="mt-5 max-w-sm text-base text-foreground/70">
              Fresh colors, new silhouettes and effortless pieces designed to move
              with your day.
            </p>
            <Link href="/shop" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-7" })}>
              Shop the collection
            </Link>
          </Reveal>

          <Reveal delayMs={100} className="relative mx-auto aspect-[5/4] w-full max-w-lg lg:aspect-auto lg:h-[340px]">
            {primary ? (
              <Link href={`/products/${primary.slug}`} className="group absolute inset-0 left-0 block h-full w-[68%] overflow-hidden">
                <ProductImage
                  media={primary.media}
                  name={primary.name}
                  category={primary.category}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </Link>
            ) : null}
            {secondary ? (
              <Link
                href={`/products/${secondary.slug}`}
                className="group absolute top-1/4 right-0 block h-2/3 w-[42%] overflow-hidden border-4 border-sand shadow-lg"
              >
                <ProductImage
                  media={secondary.media}
                  name={secondary.name}
                  category={secondary.category}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </Link>
            ) : null}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
