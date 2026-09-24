import Link from "next/link";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";

/**
 * A plain text category rail directly under the header - not an image
 * gallery, just fast, scannable shopping entry points. "New In" and "Sale"
 * are real, working routes into the existing Shop page filtering
 * (newest-sort and in-stock-only respectively); every other link is one of
 * the app's actual categories - nothing here is a category that doesn't
 * exist in the catalog.
 */
const railLinks = [
  { href: "/shop?sort=newest", label: "New In" },
  ...PRODUCT_CATEGORIES.map((category) => ({
    href: `/shop?category=${encodeURIComponent(category)}`,
    label: category,
  })),
];

export function CategoryRail() {
  return (
    <nav aria-label="Shop by category" className="border-b border-surface-border bg-surface">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
        <div className="flex items-center gap-6 relative overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {railLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="group relative shrink-0 py-1 text-sm font-medium whitespace-nowrap text-foreground/70 transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-rose-500 transition-transform duration-200 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
