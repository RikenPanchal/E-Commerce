"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { SizeGuideModal } from "@/components/shop/SizeGuideModal";
import { NotifyMeButton } from "@/components/shop/NotifyMeButton";
import { HeartIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import { hasVariants, isColorAvailable, isSizeAvailable, resolveVariant } from "@/lib/shop/variants";
import { LOW_STOCK_THRESHOLD } from "@/lib/shop/stock";
import type { ProductView } from "@/types/product";

/**
 * The one Add to Cart implementation - rendered directly by the product
 * page, and reused unchanged by Quick View, so both can never disagree
 * about price/stock/variant state. A product with no `variants` (every
 * product in the catalog today) behaves exactly as before variants existed:
 * `resolveVariant` always returns undefined, so `effectivePrice`/
 * `effectiveStock` are just `product.price`/`product.stock`, and every size/
 * color option is available. Price now renders here (not in the server
 * page) specifically so it can update live with the selected variant.
 */
export function AddToCartForm({ product }: { product: ProductView }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const { showToast } = useToast();
  const isWishlisted = has(product.id);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const usesVariants = hasVariants(product);
  const resolved = usesVariants ? resolveVariant(product, size || undefined, color || undefined) : undefined;

  // Identifies the exact thing to offer a back-in-stock alert for - by real
  // id, never by the displayed "Black / Medium" text (see
  // `subscribeToBackInStock`, which re-validates this server-side anyway).
  // `null` whenever there's nothing to notify about: a non-variant product
  // that has stock, or a variant product where the current selection either
  // isn't a real/complete combination yet or already resolves to something
  // purchasable.
  const unavailableTarget: { variantId?: string } | null = !usesVariants
    ? product.stock <= 0
      ? {}
      : null
    : resolved && !resolved.isAvailable
      ? { variantId: resolved.variant.id }
      : null;

  const primaryImage = product.media.find((item) => item.type === "image")?.url;
  const effectivePrice = resolved?.price ?? product.price;
  const effectiveCompareAtPrice = resolved?.compareAtPrice ?? product.compareAtPrice;
  const effectiveStock = resolved?.stock ?? product.stock;
  const lowStock = effectiveStock > 0 && effectiveStock <= LOW_STOCK_THRESHOLD;
  const discountPercent =
    effectiveCompareAtPrice && effectiveCompareAtPrice > effectivePrice
      ? Math.round(((effectiveCompareAtPrice - effectivePrice) / effectiveCompareAtPrice) * 100)
      : 0;

  function addToCart(): boolean {
    if (product.sizes.length > 0 && !size) {
      setMessage("Please select a size");
      return false;
    }
    if (product.colors.length > 0 && !color) {
      setMessage("Please select a color");
      return false;
    }
    if (usesVariants) {
      if (!resolved) {
        setMessage("This combination isn't available. Please choose a different size or color.");
        return false;
      }
      if (!resolved.isAvailable) {
        setMessage("This combination is currently out of stock.");
        return false;
      }
    }
    addItem({
      productId: product.id,
      variantId: resolved?.variant.id,
      slug: product.slug,
      name: product.name,
      price: effectivePrice,
      image: primaryImage,
      size: size || undefined,
      color: color || undefined,
      sku: resolved?.sku,
      quantity,
      stock: effectiveStock,
    });
    setMessage(null);
    showToast({
      message: "Added to cart",
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
    return true;
  }

  function handleBuyNow() {
    if (addToCart()) {
      router.push("/cart");
    }
  }

  // Shared by both the out-of-stock and in-stock layouts below, so a
  // customer can still save a currently-unavailable piece for later - the
  // whole point of wishlisting something out of stock.
  const wishlistButton = (
    <button
      type="button"
      onClick={() => toggle(product.id, product.name)}
      aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      aria-pressed={isWishlisted}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-foreground transition-all hover:border-rose-300 hover:text-rose-600 dark:border-white/15"
    >
      <HeartIcon filled={isWishlisted} className={`h-4 w-4 ${isWishlisted ? "text-rose-600" : ""}`} />
    </button>
  );

  // Moved here from the (server) product page so it can react to the
  // selected variant - a variant's own price, when it has one, otherwise
  // the product's price, unchanged from before variants existed.
  const priceBlock = (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-y border-rose-100 py-3 dark:border-rose-950/40">
      <span className="font-serif text-2xl font-bold text-rose-700 dark:text-rose-300">
        {formatCurrency(effectivePrice)}
      </span>
      {discountPercent > 0 ? (
        <>
          <span className="text-sm text-foreground/40 line-through">
            {formatCurrency(effectiveCompareAtPrice ?? 0)}
          </span>
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            Save {discountPercent}%
          </span>
        </>
      ) : null}
    </div>
  );

  // A non-variant product with no stock at all has nothing to pick between,
  // so it keeps the original simple layout - no size/color pickers, just
  // the out-of-stock notice and a Notify Me action alongside wishlisting.
  if (!usesVariants && unavailableTarget) {
    return (
      <div className="flex flex-col gap-3">
        {priceBlock}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-black/10 bg-black/[.02] px-3.5 py-2.5 text-xs font-semibold tracking-wide text-foreground/60 uppercase dark:border-white/15 dark:bg-white/[.03]">
            Out of stock
          </div>
          {wishlistButton}
        </div>
        <NotifyMeButton productId={product.id} productName={product.name} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {priceBlock}

      {!unavailableTarget && lowStock ? (
        <span className="w-fit rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Only {effectiveStock} left in stock
        </span>
      ) : null}

      {product.sizes.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Size</span>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="text-[11px] font-medium text-rose-600 underline-offset-4 hover:underline"
            >
              Size Guide →
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((option) => {
              const available = isSizeAvailable(product, option, color || undefined);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  disabled={!available}
                  aria-pressed={size === option}
                  aria-label={available ? undefined : `Size ${option}, unavailable`}
                  className={`min-w-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    size === option
                      ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                      : available
                        ? "border-black/10 text-foreground/70 hover:border-rose-300 hover:text-foreground dark:border-white/15"
                        : "cursor-not-allowed border-black/5 text-foreground/30 line-through dark:border-white/5"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {product.colors.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">
            Color{color ? <span className="font-normal text-foreground/50"> · {color}</span> : null}
          </span>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((option) => {
              const available = isColorAvailable(product, option.name, size || undefined);
              return (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => setColor(option.name)}
                  title={option.name}
                  disabled={!available}
                  aria-label={available ? option.name : `${option.name}, unavailable`}
                  aria-pressed={color === option.name}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    color === option.name
                      ? "border-rose-600 shadow-sm"
                      : available
                        ? "border-transparent hover:scale-110"
                        : "cursor-not-allowed border-transparent opacity-30"
                  }`}
                >
                  <span
                    // A plain border-black/10 all but disappears for a white
                    // (or near-white) swatch on this white-themed page - a
                    // stronger, fixed-opacity border keeps it visible always.
                    className="h-5 w-5 rounded-full border-2 border-black/20 shadow-sm dark:border-white/30"
                    style={{ backgroundColor: option.hex ?? "#e5e5e5" }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {unavailableTarget ? (
        <>
          <div className="flex items-center gap-2.5">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-black/10 bg-black/[.02] px-3.5 py-2.5 text-xs font-semibold tracking-wide text-foreground/60 uppercase dark:border-white/15 dark:bg-white/[.03]">
              Out of stock
            </div>
            {wishlistButton}
          </div>
          <NotifyMeButton
            productId={product.id}
            productName={product.name}
            variantId={unavailableTarget.variantId}
            variantLabel={[resolved?.variant.size, resolved?.variant.color].filter(Boolean).join(" / ") || undefined}
          />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Quantity</span>
            <div className="flex w-fit items-center gap-3 rounded-full border border-black/10 px-3 py-1.5 dark:border-white/15">
              <button
                type="button"
                onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
                className="text-foreground/60 transition-colors hover:text-rose-600"
                aria-label="Decrease quantity"
              >
                &minus;
              </button>
              <span className="w-5 text-center text-xs font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((previous) => Math.min(effectiveStock, previous + 1))}
                className="text-foreground/60 transition-colors hover:text-rose-600"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={addToCart}
              className="flex-1 rounded-full border border-black/10 bg-black/[.02] px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-white/15 dark:bg-white/[.03] dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-200"
            >
              Add to bag
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md"
            >
              Buy now
            </button>
            {wishlistButton}
          </div>
        </>
      )}

      {message ? <p className="text-xs text-red-500">{message}</p> : null}

      <SizeGuideModal
        category={product.category}
        sizes={product.sizes}
        open={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </div>
  );
}
