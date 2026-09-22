/** Shared conventions for the app's outline icons (TruckIcon, ShieldIcon,
 *  etc. in src/components/home/icons.tsx and similar per-feature icon
 *  files) - every icon already follows this shape (24x24 viewBox,
 *  `stroke="currentColor"`, 1.5 stroke width, no fill), so new icons and
 *  new call sites have one place to read the convention from instead of
 *  reinventing it, and a couple of shared size classes to reach for. */
export const ICON_STROKE_WIDTH = 1.5;

export const ICON_SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;
