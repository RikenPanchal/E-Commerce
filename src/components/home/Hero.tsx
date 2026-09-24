import Link from "next/link";
import { getFeaturedPublicProducts } from "@/lib/shop/products";
import { ProductImage } from "@/components/shop/ProductImage";
import { buttonVariants } from "@/components/ui/Button";
import { Reveal } from "@/components/home/Reveal";
import { ArrowRightIcon } from "@/components/home/icons";

/**
 * A split shopping hero - a warm cream content panel (label, headline,
 * description, two CTAs, small decorative detail) on the left holds real
 * visual weight of its own, a large real photo fills the right. Never a
 * full-bleed photo with text barely readable over it. On mobile the two
 * stack (portrait image on top, panel below) rather than forcing the
 * desktop split into a narrow viewport.
 *
 * The photo is real catalog photography (the same `getFeaturedPublicProducts`
 * call `FeaturedProducts` uses further down the page) - never an invented
 * image. `object-cover` crops to fill the frame without ever stretching or
 * squishing the source photo.
 */
export async function Hero() {
  const featured = await getFeaturedPublicProducts(4);
  const [hero] = featured;

  return (
    <section className="w-full bg-cream">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
        <div className="order-2 flex flex-col justify-center px-6 py-14 sm:px-10 sm:py-20 lg:order-1 lg:h-[600px] lg:px-14 lg:py-0 xl:px-16">
          <Reveal className="max-w-md">
            <p className="mb-5 flex items-center gap-2 text-xs font-medium tracking-[0.25em] text-rose-600 uppercase">
              <span className="h-px w-8 bg-rose-400" aria-hidden="true" />
              New season
            </p>
            <h1 className="font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your style.
              <br />
              Your moment.
            </h1>
            <p className="mt-5 max-w-sm text-base text-muted-foreground">
              Discover fresh silhouettes, effortless essentials and statement
              pieces made for every occasion.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/shop" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full justify-center sm:w-auto" })}>
                Shop new arrivals
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <a href="#categories" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full justify-center sm:w-auto" })}>
                Explore collection
              </a>
            </div>

            <div className="mt-10 flex items-center gap-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              <span>01</span>
              <span className="h-px w-6 bg-surface-border" aria-hidden="true" />
              <span>New season edit</span>
            </div>
          </Reveal>
        </div>

        <Reveal delayMs={100} className="order-1 relative h-[380px] w-full overflow-hidden sm:h-[430px] lg:order-2 lg:h-[600px]">
          {hero ? (
            <ProductImage
              media={hero.media}
              name={hero.name}
              category={hero.category}
              className="absolute inset-0 h-full w-full"
              priority
            />
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
