import type { ProductCategory } from "@/lib/data/categories";
import { PRODUCT_SIZES, type ProductSize } from "@/lib/data/productOptions";

// The product schema (`src/models/Product.ts`) has no size-chart,
// measurement, or fit fields, and no product ever carries its own
// measurements - confirmed by inspecting the schema and the admin product
// form. What follows is therefore a GENERAL reference guide only, not a
// per-product or per-brand measurement table. It must never be presented as
// this specific product's actual measurements (see the disclaimer surfaced
// alongside it in `SizeGuideModal`).

export type MeasurementKey = "bust" | "waist" | "hips";

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  bust: "Bust",
  waist: "Waist",
  hips: "Hips",
};

export const HOW_TO_MEASURE: Record<MeasurementKey, string> = {
  bust: "Measure around the fullest part of your bust, keeping the tape parallel to the floor.",
  waist: "Measure around your natural waistline, the narrowest part of your torso.",
  hips: "Measure around the fullest part of your hips, about 20cm below your waist.",
};

// Which measurements are typically relevant to a garment in each real
// category - an editorial choice about what to show, not a claim about any
// specific product. Accessories (bags, jewelry, belts) generally aren't
// sized by body measurement, so there's nothing to chart for that category.
export const CATEGORY_MEASUREMENTS: Record<ProductCategory, MeasurementKey[]> = {
  Dresses: ["bust", "waist", "hips"],
  "Tops & Blouses": ["bust", "waist"],
  "Ethnic Wear": ["bust", "waist", "hips"],
  Accessories: [],
};

type Range = readonly [number, number];

// General reference ranges in centimeters, by standard size label - not
// specific to any brand or product.
const GENERAL_SIZE_CHART_CM: Record<ProductSize, Record<MeasurementKey, Range>> = {
  XS: { bust: [78, 81], waist: [60, 63], hips: [86, 89] },
  S: { bust: [82, 85], waist: [64, 67], hips: [90, 93] },
  M: { bust: [86, 89], waist: [68, 71], hips: [94, 97] },
  L: { bust: [90, 94], waist: [72, 76], hips: [98, 102] },
  XL: { bust: [95, 99], waist: [77, 81], hips: [103, 107] },
  XXL: { bust: [100, 105], waist: [82, 87], hips: [108, 113] },
};

export type MeasurementUnit = "cm" | "in";

function cmToIn(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10;
}

export function formatMeasurementRange(size: ProductSize, key: MeasurementKey, unit: MeasurementUnit): string {
  const [min, max] = GENERAL_SIZE_CHART_CM[size][key];
  if (unit === "cm") return `${min}–${max} cm`;
  return `${cmToIn(min)}–${cmToIn(max)} in`;
}

export const SIZE_GUIDE_DISCLAIMER =
  "These are general size guidelines for reference and may vary slightly by style. They're not exact measurements for this specific product. For garment details, check the product description, or contact us if you need help choosing a size.";

export { PRODUCT_SIZES };
