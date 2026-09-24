"use client";

import { ErrorState } from "@/components/ui/ErrorState";

// Renders inside the auth layout's form column, next to the brand panel.
export default function AuthError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorState
      error={error}
      retry={retry}
      description="We couldn't load this page just now. Please try again - your account details are safe."
      links={[{ href: "/", label: "Back to home" }]}
      className="px-0"
    />
  );
}
