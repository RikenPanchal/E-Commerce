"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { BrandMark } from "@/components/home/icons";

// Catch-all for errors no section-level boundary handles - the homepage
// (app/page.tsx) and a section's own layout failing. It renders inside the
// root layout (theme, fonts and providers intact) but without the site
// header, which is server-rendered and can't be used from this client
// component, so it carries a small logo link of its own.
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-20">
      <Link href="/" className="flex items-center gap-2" aria-label="E-Commerce home">
        <BrandMark className="h-7 w-7 text-rose-500" />
        <span className="font-serif text-xl font-semibold tracking-[0.1em] text-foreground">E-Commerce</span>
      </Link>
      <ErrorState
        error={error}
        retry={retry}
        links={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
        ]}
      />
    </div>
  );
}
