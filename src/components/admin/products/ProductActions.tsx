"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductResponse, ProductView } from "@/types/product";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/admin/products/icons";
import { ProductDetailModal } from "@/components/admin/products/ProductDetailModal";

export function ProductActions({ product }: { product: ProductView }) {
  const router = useRouter();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Move "${product.name}" to trash?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const data = (await response.json()) as ProductResponse;
      if (!data.success) {
        window.alert(data.message);
        return;
      }
      router.refresh();
    } catch {
      window.alert("Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsViewOpen(true)}
          aria-label={`View ${product.name}`}
          title="View"
          className="text-foreground/60 transition-colors hover:text-foreground"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
        <Link
          href={`/admin/products/${product.id}/edit`}
          aria-label={`Edit ${product.name}`}
          title="Edit"
          className="text-foreground/60 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
        >
          <PencilIcon className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${product.name}`}
          title="Move to trash"
          className="text-foreground/60 transition-colors hover:text-red-500 disabled:opacity-50"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {isViewOpen ? (
        <ProductDetailModal product={product} onClose={() => setIsViewOpen(false)} />
      ) : null}
    </>
  );
}
