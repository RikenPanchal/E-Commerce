"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export interface ErrorStateLink {
  href: string;
  label: string;
}

/**
 * The shared "something went wrong" UI behind every `error.tsx` boundary
 * (and `global-error.tsx`) - same look and wording everywhere, sized by
 * whichever layout it lands in. The raw error message is never shown: in
 * production Next.js replaces server errors with a generic message anyway,
 * and a client error's message can be technical or sensitive. Instead the
 * `digest` - the id Next.js also prints next to the error in the server
 * logs - is shown as a short reference a customer can quote to support.
 */
export function ErrorState({
  error,
  retry,
  title = "Something went wrong",
  description = "We couldn't load this page just now. It's usually temporary - please try again in a moment.",
  links = [{ href: "/", label: "Back to home" }],
  className,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  description?: string;
  links?: ErrorStateLink[];
  className?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className={cn("mx-auto flex max-w-lg flex-col items-center gap-4 px-4 text-center", className)}>
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-blush-line bg-blush font-serif text-2xl text-rose-400"
      >
        !
      </span>
      <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => retry()} className={buttonVariants({ variant: "burgundy" })}>
          Try again
        </button>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={buttonVariants({ variant: "outline-burgundy" })}>
            {link.label}
          </Link>
        ))}
      </div>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-soft">
          Error reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
