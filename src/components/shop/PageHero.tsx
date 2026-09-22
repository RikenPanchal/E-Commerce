import Link from "next/link";

export interface PageHeroCrumb {
  label: string;
  /** Omit for the current page - rendered as plain text, never a link to itself. */
  href?: string;
}

/**
 * The breadcrumb + centered eyebrow/heading band already established by
 * Shop, the product page, and Collections - factored out here so every
 * other account/order/checkout page can open with the exact same premium
 * framing instead of a bare `<h1>`, rather than each page re-inventing its
 * own (weaker) header treatment.
 */
export function PageHero({
  breadcrumbs,
  eyebrow,
  title,
  description,
}: {
  breadcrumbs: PageHeroCrumb[];
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-muted-soft uppercase"
        >
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-rose-800">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-rose-800">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="border-b border-surface-border">
        <div className="mx-auto max-w-[820px] px-4 py-8 text-center sm:px-6 sm:py-10 lg:px-8">
          <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-rose-800 uppercase">
            <span className="h-px w-6 bg-blush-line" aria-hidden="true" />
            {eyebrow}
            <span className="h-px w-6 bg-blush-line" aria-hidden="true" />
          </span>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
