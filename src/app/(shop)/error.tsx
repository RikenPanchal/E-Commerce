"use client";

import { ErrorState } from "@/components/ui/ErrorState";

// Sits inside the (shop) layout, so the site header and footer stay on screen
// around this message - a customer can still search, open their bag, or
// navigate away instead of hitting a dead end.
export default function ShopError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-20">
      <ErrorState
        error={error}
        retry={retry}
        links={[
          { href: "/shop", label: "Continue shopping" },
          { href: "/", label: "Home" },
        ]}
      />
    </div>
  );
}
