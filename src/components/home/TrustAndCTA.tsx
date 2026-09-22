import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Reveal } from "@/components/home/Reveal";
import { CheckIcon, MessageIcon, ShieldIcon, SparkleIcon } from "@/components/home/icons";

/**
 * The homepage's closing section - real trust features on top, a Deep
 * Burgundy "start shopping" panel directly below with no gap between them,
 * so the two read as one strong closing moment rather than two separate
 * sections back to back. Consolidates what used to be two components
 * (`BrandExperience` + `ShoppingCTA`) into one, since the brief asks for a
 * single "Trust + CTA" section, not a pair.
 *
 * Built from real, already-established facts (the same assurance copy
 * shown in the announcement bar/footer) rather than invented guarantees,
 * delivery promises, or certifications the app doesn't actually back up.
 */
const features = [
  { icon: SparkleIcon, title: "Quality first", description: "Thoughtfully curated styles, chosen with care." },
  { icon: ShieldIcon, title: "Secure checkout", description: "Your data, protected." },
  { icon: CheckIcon, title: "Easy shopping", description: "Simple browsing, ordering and checkout." },
  { icon: MessageIcon, title: "Customer support", description: "We're here when you need us." },
];

export function TrustAndCTA() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-[1380px] px-4 pt-12 pb-12 sm:px-8 sm:pt-20 sm:pb-16">
        <Reveal className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">Made for your everyday</h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {features.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delayMs={index * 80} className="flex items-start gap-4">
              <span className="font-serif text-2xl text-rose-400" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex items-start gap-3 border-l border-surface-border pl-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{title}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="w-full bg-rose-800">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center gap-6 px-4 py-14 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left lg:h-[220px] lg:py-0">
          <Reveal>
            <h2 className="font-serif text-2xl font-semibold text-white sm:text-3xl">Ready for your next look?</h2>
            <p className="mt-2 max-w-sm text-sm text-white/70">
              Explore the latest styles and find something made for you.
            </p>
          </Reveal>
          <Reveal delayMs={100}>
            <Link href="/shop" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Start shopping
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
