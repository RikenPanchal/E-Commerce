// Single source of truth for product categories - used by the landing
// page, the product model/validation, and the admin product form.

export const PRODUCT_CATEGORIES = [
  "Dresses",
  "Tops & Blouses",
  "Ethnic Wear",
  "Accessories",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface CategoryPreview {
  name: ProductCategory;
  description: string;
  /** A small text-color accent, not a tile-filling gradient - the tile
     itself stays white/near-white; only the name reads in a hint of color. */
  accent: string;
}

// Marketing copy/styling for the landing page's category showcase - plain
// white cards with a thin border, not colored gradient fills, so the grid
// stays visually white/quiet rather than a rainbow of banner blocks. "Classic
// Black & White" means zero decorative color, including per-category hues -
// every tile reads in the same black/foreground text.
export const categoryPreviews: CategoryPreview[] = [
  {
    name: "Dresses",
    description: "Day to evening silhouettes",
    accent: "text-foreground",
  },
  {
    name: "Tops & Blouses",
    description: "Everyday essentials",
    accent: "text-foreground",
  },
  {
    name: "Ethnic Wear",
    description: "Timeless craftsmanship",
    accent: "text-foreground",
  },
  {
    name: "Accessories",
    description: "Finish the look",
    accent: "text-foreground",
  },
];
