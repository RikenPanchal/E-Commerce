"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart/CartProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAccessibleDialog } from "@/components/ui/useAccessibleDialog";
import { SizeGuideModal } from "@/components/shop/SizeGuideModal";
import { NotifyMeButton } from "@/components/shop/NotifyMeButton";
import { CloseIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import { hasVariants, isColorAvailable, isSizeAvailable, resolveVariant } from "@/lib/shop/variants";
import type { ProductView } from "@/types/product";

/**
 * The compact variant selector opened by "Quick add" on a `ProductCard` when
 * a product has required size/color options - a product page's worth of
 * choices wouldn't fit here (and shouldn't - that's what Quick View and the
 * product page are for). Deliberately minimal compared to `AddToCartForm`:
 * no quantity stepper (spec allows skipping it, and the cart page already
 * supports changing quantity after adding), no wishlist button (already on
 * the card itself), no "Buy now". Same cart logic (`useCart().addItem`) and
 * toast feedback as everywhere else Add to Cart happens.
 */
export function QuickAddSheet({
  product,
  open,
  onClose,
}: {
  product: ProductView;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { mounted, dialogRef } = useAccessibleDialog<HTMLDivElement>(open, onClose);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  // A ref, not state: guards against a genuine double-click firing this
  // handler twice in the same synchronous tick, before React has a chance
  // to re-render a disabled button - a state flag would lag one render
  // behind and let both clicks through. Reset on every fresh open, since
  // this component instance persists (it just renders null while closed)
  // rather than unmounting - without this reset, one successful add would
  // permanently disable "Add to cart" the next time this same card's sheet
  // is opened.
  const isSubmittingRef = useRef(false);
  useEffect(() => {
    if (open) isSubmittingRef.current = false;
  }, [open]);

  if (!mounted || !open) return null;

  const usesVariants = hasVariants(product);
  const resolved = usesVariants ? resolveVariant(product, size || undefined, color || undefined) : undefined;

  // Same rule as `AddToCartForm` (the one other place this decision is
  // made) - identifies the exact product/variant to offer an alert for by
  // id, never by display text.
  const unavailableTarget: { variantId?: string } | null = !usesVariants
    ? product.stock <= 0
      ? {}
      : null
    : resolved && !resolved.isAvailable
      ? { variantId: resolved.variant.id }
      : null;

  const primaryImage = product.media.find((item) => item.type === "image")?.url;
  const effectivePrice = resolved?.price ?? product.price;
  const effectiveStock = resolved?.stock ?? product.stock;

  function handleAddToCart() {
    if (isSubmittingRef.current) return;

    const missing: string[] = [];
    if (product.sizes.length > 0 && !size) missing.push("a size");
    if (product.colors.length > 0 && !color) missing.push("a color");
    if (missing.length > 0) {
      setMessage(`Please select ${missing.join(" and ")}.`);
      return;
    }
    if (usesVariants) {
      if (!resolved) {
        setMessage("This combination isn't available.");
        return;
      }
      if (!resolved.isAvailable) {
        setMessage("This combination is currently out of stock.");
        return;
      }
    }

    isSubmittingRef.current = true;
    setMessage(null);
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
      quantity: 1,
      stock: effectiveStock,
    });
    showToast({
      message: "Added to cart",
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
    onClose();
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Add ${product.name} to cart`}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-4 overflow-y-auto rounded-t-lg border-t border-surface-border bg-surface p-5 shadow-xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[80vh] sm:w-[min(90vw,380px)] sm:rounded-lg sm:border"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 pr-2">
            <h2 className="font-serif text-base font-semibold text-foreground">{product.name}</h2>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(effectivePrice)}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-black/[.04] hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {!usesVariants && unavailableTarget ? (
          <>
            <p className="rounded-2xl border border-black/10 bg-black/[.02] px-3.5 py-2.5 text-xs font-semibold tracking-wide text-foreground/60 uppercase">
              Out of stock
            </p>
            <NotifyMeButton productId={product.id} productName={product.name} className="mt-1 w-full" />
          </>
        ) : (
          <>
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
                        aria-label={available ? `Select size ${option}` : `Size ${option}, unavailable`}
                        aria-pressed={size === option}
                        className={`min-w-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          size === option
                            ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                            : available
                              ? "border-black/10 text-foreground/70 hover:border-rose-300 hover:text-foreground"
                              : "cursor-not-allowed border-black/5 text-foreground/30 line-through"
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
                        aria-label={available ? `Select color ${option.name}` : `${option.name}, unavailable`}
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
                          className="h-5 w-5 rounded-full border-2 border-black/20 shadow-sm"
                          style={{ backgroundColor: option.hex ?? "#e5e5e5" }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {message ? <p className="text-xs text-red-500">{message}</p> : null}

            {unavailableTarget ? (
              <>
                <p className="rounded-2xl border border-black/10 bg-black/[.02] px-3.5 py-2.5 text-xs font-semibold tracking-wide text-foreground/60 uppercase">
                  Out of stock
                </p>
                <NotifyMeButton
                  productId={product.id}
                  productName={product.name}
                  variantId={unavailableTarget.variantId}
                  variantLabel={[resolved?.variant.size, resolved?.variant.color].filter(Boolean).join(" / ") || undefined}
                  className="mt-1 w-full"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                aria-label={`Add ${product.name} to cart`}
                className="mt-1 flex items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Add to cart
              </button>
            )}
          </>
        )}
      </div>

      <SizeGuideModal
        category={product.category}
        sizes={product.sizes}
        open={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </>,
    document.body
  );
}
