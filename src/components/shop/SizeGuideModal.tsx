"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAccessibleDialog } from "@/components/ui/useAccessibleDialog";
import { CloseIcon } from "@/components/home/icons";
import {
  CATEGORY_MEASUREMENTS,
  HOW_TO_MEASURE,
  MEASUREMENT_LABELS,
  PRODUCT_SIZES,
  SIZE_GUIDE_DISCLAIMER,
  formatMeasurementRange,
  type MeasurementUnit,
} from "@/lib/data/sizeGuide";
import type { ProductCategory } from "@/lib/data/categories";
import type { ProductSize } from "@/lib/data/productOptions";

/**
 * One reusable Size Guide, opened the same way from the product page, Quick
 * View (via the shared `AddToCartForm`), and Quick Add (`QuickAddSheet`).
 * Purely informational - it never selects a size itself (see spec: the size
 * selector remains the only way to actually choose a size) and never touches
 * the caller's size/color state, so opening/closing it can't disturb
 * whatever the customer already picked underneath. Portals independently of
 * whatever dialog it was opened from and sits above it (z-[55] vs. their
 * z-50), and `useAccessibleDialog`'s dialog stack makes Escape close only
 * this one, not the Quick View/Quick Add sheet it was opened from.
 */
export function SizeGuideModal({
  category,
  sizes,
  open,
  onClose,
}: {
  category: ProductCategory;
  /** This product's own offered sizes, used only to flag which rows of the
   *  general chart are relevant here - never to alter the chart's numbers. */
  sizes: ProductSize[];
  open: boolean;
  onClose: () => void;
}) {
  const { mounted, dialogRef } = useAccessibleDialog<HTMLDivElement>(open, onClose);
  const [unit, setUnit] = useState<MeasurementUnit>("cm");

  if (!mounted || !open) return null;

  const measurements = CATEGORY_MEASUREMENTS[category];
  const offeredSizes = new Set(sizes);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[55] bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="fixed inset-x-0 bottom-0 z-[55] flex max-h-[92vh] flex-col overflow-y-auto rounded-t-lg border-t border-surface-border bg-surface shadow-xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:w-[min(90vw,640px)] sm:rounded-lg sm:border"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface px-5 py-4">
          <h2 id="size-guide-title" className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">
            Size Guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-black/[.04] hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          {measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This category typically isn&apos;t sized by body measurement. Check the product description for
              specific sizing details, or contact us if you need help choosing.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-[0.08em] text-foreground uppercase">How to measure</h3>
                <dl className="grid gap-3 sm:grid-cols-3">
                  {measurements.map((key) => (
                    <div key={key} className="rounded-md bg-background px-3 py-2.5">
                      <dt className="text-xs font-semibold text-foreground">{MEASUREMENT_LABELS[key]}</dt>
                      <dd className="mt-0.5 text-xs text-muted-foreground">{HOW_TO_MEASURE[key]}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-[0.08em] text-foreground uppercase">Size chart</h3>
                  <div className="flex rounded-full border border-surface-border p-0.5 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setUnit("cm")}
                      aria-pressed={unit === "cm"}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        unit === "cm" ? "bg-foreground text-background" : "text-foreground/60"
                      }`}
                    >
                      CM
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnit("in")}
                      aria-pressed={unit === "in"}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        unit === "in" ? "bg-foreground text-background" : "text-foreground/60"
                      }`}
                    >
                      IN
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border border-surface-border">
                  <table className="w-full min-w-[420px] border-collapse text-left text-xs">
                    <caption className="sr-only">
                      General size chart with {measurements.map((key) => MEASUREMENT_LABELS[key]).join(", ")}{" "}
                      measurements by size, in {unit === "cm" ? "centimeters" : "inches"}
                    </caption>
                    <thead>
                      <tr className="border-b border-surface-border bg-background">
                        <th scope="col" className="px-3 py-2.5 font-semibold text-foreground">
                          Size
                        </th>
                        {measurements.map((key) => (
                          <th key={key} scope="col" className="px-3 py-2.5 font-semibold text-foreground">
                            {MEASUREMENT_LABELS[key]} ({unit})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PRODUCT_SIZES.map((size) => (
                        <tr key={size} className="border-b border-surface-border last:border-0">
                          <th scope="row" className="px-3 py-2.5 font-medium whitespace-nowrap text-foreground">
                            {size}
                            {offeredSizes.has(size) ? (
                              <span className="ml-1.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium text-rose-700">
                                Available
                              </span>
                            ) : null}
                          </th>
                          {measurements.map((key) => (
                            <td key={key} className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                              {formatMeasurementRange(size, key, unit)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <p className="border-t border-surface-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
            {SIZE_GUIDE_DISCLAIMER}
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}
