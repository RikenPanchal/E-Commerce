import type { ReactNode } from "react";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

/** Shared shell for the policy pages (Returns, Shipping, Privacy, Terms) -
 *  same card-on-blush-wash language as the rest of the site, so a legal
 *  page doesn't suddenly look like a different, unstyled site bolted on. */
export function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string;
  /** ISO date string - kept as a real prop (not hardcoded per-page) so every
   *  policy can be re-dated independently as it's actually revised. */
  updatedAt: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-gradient-to-b from-rose-50/50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-2 text-center">
          <span className="mx-auto w-fit rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            Policies
          </span>
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
          <p className="text-xs text-foreground/50">Last updated {dateFormatter.format(new Date(updatedAt))}</p>
          {intro ? <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/70">{intro}</p> : null}
        </div>

        <div className="mt-10 flex flex-col gap-8 rounded-3xl border border-rose-100 bg-white/80 p-6 shadow-sm dark:border-rose-950/40 dark:bg-transparent dark:shadow-none sm:p-9">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-serif text-lg font-semibold text-foreground">{heading}</h2>
      <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-foreground/70">{children}</div>
    </section>
  );
}
