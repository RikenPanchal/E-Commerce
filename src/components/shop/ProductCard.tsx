"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { ProductImage } from "@/components/shop/ProductImage";
import { StarRating } from "@/components/shop/StarRating";
import { QuickViewModal } from "@/components/shop/QuickViewModal";
import { QuickAddSheet } from "@/components/shop/QuickAddSheet";
import { HeartIcon, EyeIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductView } from "@/types/product";
import type { RatingSummary } from "@/types/review";
import { swatchStyle } from "@/lib/shop/colors";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function ProductCard({
  product,
  rating,
  badge,
}: {
  product: ProductView;
  rating?: RatingSummary;
  /** Optional corner ribbon (e.g. "New") for showcase sections like New Arrivals.
   *  Falls back to an auto "-X%" badge when the product has a sale price, so
   *  callers that don't pass one still get a badge when there's something to say. */
  badge?: string;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const { showToast } = useToast();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  // A ref, not state: blocks a genuine double-click from firing this handler
  // twice in the same tick, before React would have re-rendered a disabled
  // button.
  const isAddingRef = useRef(false);
  const isWishlisted = has(product.id);
  const isOutOfStock = product.stock <= 0;
  const needsVariantPick = product.sizes.length > 0 || product.colors.length > 0;
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;
  const displayBadge = badge ?? (discountPercent > 0 ? `-${discountPercent}%` : undefined);
  // A second real photo, if the product actually has one - never invented.
  // `ProductImage` always shows only the first image, so the hover-swap
  // layer below is built from the raw media array directly.
  const images = product.media.filter((item) => item.type === "image");
  const hoverImage = images[1];

  // The one Quick Add entry point for this card (hover bar, corner circle,
  // and the bottom text action all call this). No variants required ->
  // add straight to the cart; a required size/color -> open the compact
  // selector instead of forcing a trip to the full product page.
  function handleQuickAdd() {
    if (needsVariantPick) {
      setIsQuickAddOpen(true);
      return;
    }
    if (isAddingRef.current) return;
    isAddingRef.current = true;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.media.find((item) => item.type === "image")?.url,
      quantity: 1,
      stock: product.stock,
    });
    showToast({
      message: "Added to cart",
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
    window.setTimeout(() => {
      isAddingRef.current = false;
    }, 600);
  }

  return (
    // Image-first, deliberately not "a card": no border, no shadow, no
    // rounded box around the whole thing - just a large, sharp-cornered
    // photo (editorial photography doesn't get rounded corners) and plain
    // text below it. Hover zooms/crossfades the image and reveals a "Quick
    // add" bar (desktop only - there's no hover state on touch), and keeps
    // small always-visible circles in the corners so touch devices still
    // get one-tap access. The one shared card every product-listing section
    // on the site renders (Best Sellers, Trending, New Arrivals, Shop,
    // category pages, product-detail recommendations).
    <div className="group flex flex-col">
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] w-full overflow-hidden bg-background">
          {displayBadge ? (
            <span className="absolute top-2 left-2 z-10 bg-rose-600 px-2 py-1 text-[10px] font-semibold tracking-wide text-background uppercase">
              {displayBadge}
            </span>
          ) : null}
          <ProductImage
            media={product.media}
            name={product.name}
            category={product.category}
            className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
          {/* A second real photo, only when the product actually has one -
              crossfades in on hover instead of the plain zoom above. */}
          {hoverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hoverImage.url}
              alt={hoverImage.alt ?? product.name}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
            />
          ) : null}
        </Link>

        {/* Hover-revealed action bar on desktop. */}
        {isOutOfStock ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 sm:block">
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Quick add ${product.name}`}
              aria-haspopup={needsVariantPick ? "dialog" : undefined}
              className="pointer-events-auto flex w-full items-center justify-center bg-foreground/95 py-2.5 text-[11px] font-medium tracking-[0.1em] text-background uppercase backdrop-blur-sm"
            >
              Quick add
            </button>
          </div>
        )}

        {/* Always-visible circle too, so touch devices (no hover) keep a
            one-tap way to add without needing the bar above. A plain
            translucent circle with no border/shadow - just enough contrast
            to read on top of any photo, inverting to solid ink on hover. */}
        {isOutOfStock ? null : (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Quick add ${product.name}`}
            aria-haspopup={needsVariantPick ? "dialog" : undefined}
            className="absolute right-2 bottom-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground hover:text-background"
          >
            <PlusIcon />
          </button>
        )}

        {/* Wishlist - a small circle in the top-right, always visible (not
            hover-only) so it's reachable on touch. Never inside the image
            `Link` (a nested interactive element would be invalid HTML and
            would also trigger navigation on tap) - a plain sibling button
            instead. */}
        <button
          type="button"
          onClick={() => toggle(product.id, product.name)}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground hover:text-background"
        >
          <HeartIcon filled={isWishlisted} className={`h-4 w-4 ${isWishlisted ? "text-rose-600" : ""}`} />
        </button>

        {/* Quick View - the one remaining unused corner. Hover-revealed on
            desktop (mirrors the bottom action bar's reveal), always visible
            on touch devices since there's no hover to reveal it there.
            Opens with the exact `product`/`rating` this card already has -
            no extra fetch just to show the modal. */}
        <button
          type="button"
          onClick={() => setIsQuickViewOpen(true)}
          aria-label={`Quick view ${product.name}`}
          aria-haspopup="dialog"
          className="absolute bottom-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-foreground opacity-100 backdrop-blur-sm transition-all hover:bg-foreground hover:text-background sm:opacity-0 sm:group-hover:opacity-100"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        <span className="text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
          {product.category}
        </span>
        <Link
          href={`/products/${product.slug}`}
          className="block truncate font-serif text-sm font-semibold text-foreground transition-colors hover:text-rose-600"
        >
          {product.name}
        </Link>
        <StarRating rating={rating?.average ?? 0} count={rating?.count ?? 0} />
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-sm font-semibold text-foreground">{formatCurrency(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price ? (
            <>
              <span className="text-[11px] text-muted-foreground line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
              <span className="text-[11px] font-medium text-rose-600">Save {discountPercent}%</span>
            </>
          ) : null}
        </div>
        {product.colors.length > 0 ? (
          <div className="mt-0.5 flex items-center gap-1.5">
            {product.colors.slice(0, 5).map((color) => (
              <span
                key={color.name}
                title={color.name}
                // A plain border-black/10 all but disappears for a white
                // (or near-white) swatch against this white-themed card -
                // a stronger, fixed-opacity border keeps it visible always.
                className="h-3 w-3 rounded-full border-2 border-black/20 shadow-sm dark:border-white/30"
                style={swatchStyle(color.name, color.hex)}
              />
            ))}
            {product.colors.length > 5 ? (
              <span className="text-[10px] text-muted-foreground">+{product.colors.length - 5}</span>
            ) : null}
          </div>
        ) : null}

        {/* Pushed to the bottom of the card via mt-auto/flex-1 above, so
            short and long product names both end with the control aligned
            across a row. A plain underline-on-hover text action rather
            than a bordered button box - "minimal controls", not a second
            button competing with the photo for attention. */}
        <div className="mt-auto pt-2">
          {isOutOfStock ? (
            <span className="text-[11px] font-medium text-muted-foreground">Out of stock</span>
          ) : (
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Quick add ${product.name}`}
              className="text-[11px] font-medium text-foreground underline-offset-4 hover:underline"
            >
              Quick add
            </button>
          )}
        </div>
      </div>

      <QuickViewModal
        product={product}
        rating={rating}
        open={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
      <QuickAddSheet product={product} open={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
