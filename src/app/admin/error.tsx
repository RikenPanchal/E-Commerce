"use client";

import { ErrorState } from "@/components/ui/ErrorState";

// Sits inside the admin layout, so the admin sidebar stays available.
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-16">
      <ErrorState
        error={error}
        retry={retry}
        title="This admin page failed to load"
        description="Nothing was changed. Try again, and if it keeps happening, note the error reference below - it matches the entry in the server logs."
        links={[{ href: "/admin", label: "Back to dashboard" }]}
      />
    </div>
  );
}
