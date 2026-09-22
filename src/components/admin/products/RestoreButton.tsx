"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductResponse } from "@/types/product";

export function RestoreButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/restore`, { method: "POST" });
      const data = (await response.json()) as ProductResponse;
      if (!data.success) {
        window.alert(data.message);
        return;
      }
      router.refresh();
    } catch {
      window.alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-black/20 disabled:opacity-50 dark:border-white/15 dark:hover:border-white/30"
    >
      {isSubmitting ? "Restoring..." : "Restore"}
    </button>
  );
}
