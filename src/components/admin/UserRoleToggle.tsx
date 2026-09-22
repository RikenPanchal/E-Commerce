"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthResponse, UserRole } from "@/types/auth";

interface UserRoleToggleProps {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}

export function UserRoleToggle({ userId, role, disabled }: UserRoleToggleProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextRole: UserRole = role === "admin" ? "user" : "admin";

  if (disabled) {
    return <span className="text-xs text-foreground/40">You</span>;
  }

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = (await response.json()) as AuthResponse;

      if (!data.success) {
        setError(data.message);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-black/20 disabled:opacity-50 dark:border-white/15 dark:hover:border-white/30"
      >
        {isSubmitting
          ? "Updating..."
          : nextRole === "admin"
            ? "Promote to admin"
            : "Revoke admin"}
      </button>
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </div>
  );
}
