"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CollectionResponse, CollectionView } from "@/types/collection";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/admin/collections/icons";

export function CollectionActions({ collection }: { collection: CollectionView }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${collection.name}"? This can't be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/collections/${collection.id}`, { method: "DELETE" });
      const data = (await response.json()) as { success: boolean; message?: string };
      if (!data.success) {
        window.alert(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggle() {
    setIsToggling(true);
    try {
      const response = await fetch(`/api/admin/collections/${collection.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !collection.isActive }),
      });
      const data = (await response.json()) as CollectionResponse;
      if (!data.success) {
        window.alert(data.message);
        return;
      }
      router.refresh();
    } catch {
      window.alert("Something went wrong. Please try again.");
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <a
        href={`/collections/${collection.slug}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Preview ${collection.name}`}
        title="Preview"
        className="text-foreground/60 transition-colors hover:text-foreground"
      >
        <EyeIcon className="h-4 w-4" />
      </a>
      <Link
        href={`/admin/collections/${collection.id}/edit`}
        aria-label={`Edit ${collection.name}`}
        title="Edit"
        className="text-foreground/60 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
      >
        <PencilIcon className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isToggling}
        className="text-xs font-medium text-foreground/60 underline decoration-dotted transition-colors hover:text-foreground disabled:opacity-50"
      >
        {collection.isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Delete ${collection.name}`}
        title="Delete"
        className="text-foreground/60 transition-colors hover:text-red-500 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
