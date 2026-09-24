import type { CSSProperties } from "react";
import { hexForColorName } from "@/lib/data/colorNames";

// Product color names are free-form and often describe a mix - "Black & Red",
// "Navy/White", "Blue, Mustard", "Black and Gold". The first color named is the
// product's *main* color (a black dress with red flowers is "Black & Red"), and
// that's what the Shop color filter works on: the list shows main colors only,
// and picking "Red" returns products that are mainly red - not every product
// with a red accent, which read as wrong results next to a black swatch.

const SEPARATOR = /\s*(?:&|\/|,|\+|\band\b)\s*/i;

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** "Black & Red" -> ["Black", "Red"]; "sky blue" -> ["Sky Blue"]. */
export function splitColorName(name: string): string[] {
  return name
    .split(SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(titleCase);
}

/** The product's main color - the first one named ("Black & Red" -> "Black"). */
export function mainColorName(name: string): string {
  return splitColorName(name)[0] ?? name.trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches a color name whose *main* (first) color is `color` - "Red" matches
 *  "Red" and "Red & Gold" but not "Black & Red", and never "Redwood". An
 *  exact full name (an old "?color=Black & Red" link) still matches itself. */
export function mainColorRegex(color: string): RegExp {
  return new RegExp(`^\\s*${escapeRegex(color.trim())}\\s*(?:$|[&/,+]|\\sand\\s)`, "i");
}

/** Mixed / patterned "colors" get a multicolor swatch rather than one flat hex. */
export function isMulticolorName(name: string): boolean {
  return /^(multi|multicolou?r|multi-colou?r|assorted)$/i.test(name.trim());
}

const FALLBACK_HEX = "#e5e5e5";
const MULTICOLOR_GRADIENT = "conic-gradient(#e11d48, #f59e0b, #16a34a, #2563eb, #9333ea, #e11d48)";

/**
 * Inline style for a color swatch dot. A product color stores one hex - its
 * main color's - so a combined name like "Black & Red" is drawn as a split
 * dot: the stored hex for the main color, then the standard hex for each
 * other named color, so shoppers can see both at a glance.
 */
export function swatchStyle(name: string, hex?: string): CSSProperties {
  if (isMulticolorName(name)) return { backgroundImage: MULTICOLOR_GRADIENT };
  const parts = splitColorName(name);
  const colors = parts.map((part, index) =>
    index === 0 ? (hex ?? hexForColorName(part) ?? FALLBACK_HEX) : (hexForColorName(part) ?? FALLBACK_HEX)
  );
  if (colors.length <= 1) return { backgroundColor: colors[0] ?? hex ?? FALLBACK_HEX };
  const step = 100 / colors.length;
  const stops = colors.map((color, index) => `${color} ${index * step}% ${(index + 1) * step}%`).join(", ");
  return { backgroundImage: `linear-gradient(135deg, ${stops})` };
}
