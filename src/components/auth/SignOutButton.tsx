"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_CLASSNAME = "text-sm font-medium text-foreground underline underline-offset-4 disabled:opacity-50";

export function SignOutButton({ className }: { className?: string } = {}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={`disabled:opacity-50 ${className ?? DEFAULT_CLASSNAME}`}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
