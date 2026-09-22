import type { ComponentType } from "react";
import type { ProductCategory } from "@/lib/data/categories";

/** Simple line-art silhouettes used as a "no photo yet" placeholder, so an
 *  empty Dresses card looks different from an empty Accessories card
 *  instead of every placeholder being the same generic hanger. */

function DressSilhouette() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-16 w-16">
      <path
        d="M19 6h10l1.5 5-2 2 4 20a2 2 0 0 1-2 2.4H16.5a2 2 0 0 1-2-2.4l4-20-2-2L19 6Z"
        strokeLinejoin="round"
      />
      <path d="M19 6c0 3 10 3 10 0" strokeLinecap="round" />
      <path d="M21.5 15.5h5" strokeLinecap="round" />
    </svg>
  );
}

function BlouseSilhouette() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-16 w-16">
      <path
        d="M17 8 10 12l2 6 4-2v18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V16l4 2 2-6-7-4-3 3h-6l-3-3Z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EthnicSilhouette() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-16 w-16">
      <path d="M18 6h12l2 4-3 2 3 4-16 0 3-4-3-2 2-4Z" strokeLinejoin="round" />
      <path d="M16 16c2 6-4 10-4 18a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2c0-8-6-12-4-18" strokeLinejoin="round" />
      <path d="M18 22c4 2 8 2 12 0" strokeLinecap="round" />
    </svg>
  );
}

function AccessorySilhouette() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-16 w-16">
      <path d="M17 16V12a7 7 0 0 1 14 0v4" strokeLinecap="round" />
      <path d="M12 16h24l-2 20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2l-2-20Z" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2.2" />
    </svg>
  );
}

const CATEGORY_ART: Record<ProductCategory, ComponentType> = {
  Dresses: DressSilhouette,
  "Tops & Blouses": BlouseSilhouette,
  "Ethnic Wear": EthnicSilhouette,
  Accessories: AccessorySilhouette,
};

// A soft blush wash instead of flat neutral gray - on a card-level element
// repeated across a whole grid this is what actually reads as "boutique"
// rather than "empty placeholder box", while staying gentle enough not to
// compete with real product photos once they're uploaded.
const CATEGORY_TINT: Record<ProductCategory, string> = {
  Dresses: "from-rose-100 via-rose-50 to-white text-rose-300 dark:from-rose-950/40 dark:text-rose-900",
  "Tops & Blouses": "from-orange-100 via-rose-50 to-white text-orange-300 dark:from-orange-950/30 dark:text-orange-900",
  "Ethnic Wear": "from-amber-100 via-rose-50 to-white text-amber-300 dark:from-amber-950/30 dark:text-amber-900",
  Accessories: "from-fuchsia-100 via-rose-50 to-white text-fuchsia-300 dark:from-fuchsia-950/30 dark:text-fuchsia-900",
};

export function CategoryPlaceholder({ category }: { category?: ProductCategory }) {
  const Art = category ? CATEGORY_ART[category] : DressSilhouette;
  const tint = category ? CATEGORY_TINT[category] : CATEGORY_TINT.Dresses;

  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br dark:via-neutral-900 dark:to-neutral-900 ${tint}`}>
      <Art />
      <span className="text-xs font-medium text-foreground/35">No photo yet</span>
    </div>
  );
}
