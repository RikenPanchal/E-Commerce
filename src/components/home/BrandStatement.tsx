import { Reveal } from "@/components/home/Reveal";

/**
 * A pure editorial breathing-room moment right after the Hero - no image,
 * no product, just a small label and one large serif statement with a lot
 * of quiet space around it. Stops the page from going straight from "big
 * photo" into "product carousel", which is what would make it read as an
 * ordinary ecommerce listing rather than a fashion site with something to
 * say. The line itself is a plain point of view, not an invented claim or
 * a fake statistic.
 */
export function BrandStatement() {
  return (
    <section className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="mb-6 flex items-center justify-center gap-2 text-xs font-medium tracking-[0.25em] text-rose-600 uppercase">
            <span className="h-px w-8 bg-rose-400" aria-hidden="true" />
            Our world
            <span className="h-px w-8 bg-rose-400" aria-hidden="true" />
          </p>
          <p className="font-serif text-4xl leading-[1.15] font-semibold text-foreground sm:text-5xl lg:text-6xl">
            Style is not
            <br />
            just what you wear.
          </p>
          <p className="mt-5 text-sm text-muted-foreground sm:text-base">
            It&apos;s how thoughtfully designed pieces move with you, day to day.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
