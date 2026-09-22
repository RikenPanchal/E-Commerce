"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/currency";

// Layout/position only - the thumb's own appearance and (critically) its
// `pointer-events: auto` override live in globals.css as plain CSS
// (`.price-range-input`). Tailwind's `[&::-webkit-slider-thumb]` arbitrary-
// variant syntax does not reliably generate a rule for vendor-prefixed
// pseudo-elements - it silently produced no CSS at all here, leaving
// `pointer-events: none` (from the base utility below) in effect on the
// thumb too, which made the slider completely undraggable.
const THUMB_CLASSES = "price-range-input pointer-events-none absolute inset-x-0 top-1/2 h-4 w-full -translate-y-1/2 bg-transparent";

/**
 * A dual-thumb price slider bounded by the catalog's real current min/max
 * price (`getShopFacets`, computed from the actual product data - never a
 * hard-coded currency range). Purely local React state while dragging -
 * the chosen range is only carried into `minPrice`/`maxPrice` hidden
 * fields on the surrounding filter form, submitted once the visitor clicks
 * "Apply filters" (the same existing apply-triggered navigation every
 * other sidebar filter already uses), so no request ever fires mid-drag.
 */
export function PriceRangeSlider({
  min,
  max,
  initialMin,
  initialMax,
}: {
  min: number;
  max: number;
  initialMin?: number;
  initialMax?: number;
}) {
  const [range, setRange] = useState<[number, number]>([
    Math.max(min, initialMin ?? min),
    Math.min(max, initialMax ?? max),
  ]);
  const [activeThumb, setActiveThumb] = useState<"min" | "max">("min");

  if (min >= max) {
    // A one-product (or single-price) catalog has nothing to range over.
    return null;
  }

  const [rangeMin, rangeMax] = range;
  const minPercent = ((rangeMin - min) / (max - min)) * 100;
  const maxPercent = ((rangeMax - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-border" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-rose-800"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={rangeMin}
          onPointerDown={() => setActiveThumb("min")}
          onChange={(event) => {
            const next = Math.min(Number(event.target.value), rangeMax);
            setRange([next, rangeMax]);
          }}
          aria-label="Minimum price"
          className={THUMB_CLASSES}
          style={{ zIndex: activeThumb === "min" ? 3 : 2 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={rangeMax}
          onPointerDown={() => setActiveThumb("max")}
          onChange={(event) => {
            const next = Math.max(Number(event.target.value), rangeMin);
            setRange([rangeMin, next]);
          }}
          aria-label="Maximum price"
          className={THUMB_CLASSES}
          style={{ zIndex: activeThumb === "max" ? 3 : 2 }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-foreground">
        <span>{formatCurrency(rangeMin)}</span>
        <span>{formatCurrency(rangeMax)}</span>
      </div>

      {/* The values that actually get submitted - the field is omitted
          entirely at the catalog's own outer bounds, so leaving the slider
          untouched never adds a stray empty `minPrice=` to the URL. */}
      {rangeMin > min ? <input type="hidden" name="minPrice" value={rangeMin} /> : null}
      {rangeMax < max ? <input type="hidden" name="maxPrice" value={rangeMax} /> : null}
    </div>
  );
}
