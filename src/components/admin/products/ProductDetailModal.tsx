"use client";

import { useEffect } from "react";
import type { ProductView } from "@/types/product";
import { CloseIcon } from "@/components/admin/products/icons";
import { formatCurrency } from "@/lib/utils/currency";
import { swatchStyle } from "@/lib/shop/colors";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function ProductDetailModal({
  product,
  onClose,
}: {
  product: ProductView;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/10">
          <h2 id="product-detail-title" className="text-lg font-semibold text-foreground">
            {product.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-foreground/50 transition-colors hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-6">
          {product.media.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {product.media.map((item) =>
                item.type === "video" ? (
                  <video
                    key={item.id}
                    src={item.url}
                    controls
                    className="aspect-square w-full rounded-lg bg-black/5 object-cover dark:bg-white/5"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.url}
                    alt={item.alt ?? product.name}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-foreground/50">No photos or video yet.</p>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <DetailField label="Category" value={product.category} />
            <DetailField label="SKU" value={product.sku} />
            <DetailField label="Price" value={formatCurrency(product.price)} />
            {product.compareAtPrice !== undefined ? (
              <DetailField label="Compare-at" value={formatCurrency(product.compareAtPrice)} />
            ) : null}
            <DetailField label="Stock" value={String(product.stock)} />
            <DetailField label="Featured" value={product.isFeatured ? "Yes" : "No"} />
            {product.brand ? <DetailField label="Brand" value={product.brand} /> : null}
            {product.material ? <DetailField label="Material" value={product.material} /> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
              Description
            </span>
            <p className="whitespace-pre-wrap text-sm text-foreground/80">{product.description}</p>
          </div>

          {product.sizes.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                Sizes
              </span>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <span
                    key={size}
                    className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-foreground/80 dark:bg-white/10"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {product.colors.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                Colors
              </span>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color) => (
                  <div key={color.name} className="flex items-center gap-1.5 text-xs text-foreground/80">
                    <span
                      // border-black/10 was nearly invisible for a white (or
                      // near-white) swatch against this white-themed page -
                      // a stronger, fixed-opacity border keeps every swatch
                      // outlined regardless of how light its color is.
                      className="h-4 w-4 rounded-full border-2 border-black/20 shadow-sm dark:border-white/30"
                      style={swatchStyle(color.name, color.hex)}
                    />
                    {color.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {product.tags.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-rose-100 px-2.5 py-1 text-xs text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 border-t border-black/5 pt-4 text-xs text-foreground/50 dark:border-white/10">
            <span>Created {dateFormatter.format(new Date(product.createdAt))}</span>
            <span>Updated {dateFormatter.format(new Date(product.updatedAt))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
