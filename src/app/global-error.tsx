"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { BrandMark } from "@/components/home/icons";
import "./globals.css";

// Last-resort boundary for an error in the root layout itself. It replaces
// that layout entirely, so it has to bring its own <html>/<body>, stylesheet
// and the permanent `dark` class the root layout normally sets (see
// layout.tsx and the `dark` variant in globals.css) - otherwise it would
// render unstyled. Plain <a> links, not next/link: with the root layout
// broken, a full page load is the most reliable way back.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-10 bg-background px-4 py-20 text-foreground">
        <title>Something went wrong | E-Commerce</title>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload on purpose, see above */}
        <a href="/" className="flex items-center gap-2" aria-label="E-Commerce home">
          <BrandMark className="h-7 w-7 text-rose-500" />
          <span className="font-serif text-xl font-semibold tracking-[0.1em]">E-Commerce</span>
        </a>
        <ErrorState error={error} retry={retry} links={[]} />
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload on purpose, see above */}
        <a href="/" className="text-sm font-medium text-rose-400 underline underline-offset-4">
          Back to home
        </a>
      </body>
    </html>
  );
}
