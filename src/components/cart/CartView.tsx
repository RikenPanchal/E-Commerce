"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { RecommendationsSection } from "@/components/shop/RecommendationsSection";
import { CouponBox } from "@/components/shop/CouponBox";
import { AvailableOffers } from "@/components/shop/AvailableOffers";
import { buttonVariants } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/currency";

export function CartView() {
  const { items, subtotal, isHydrated, updateQuantity, removeItem, appliedCoupon } = useCart();

  if (isHydrated && items.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="font-serif text-2xl font-bold text-foreground">Your bag is empty</h1>
        <p className="text-foreground/60">Find something you&apos;ll love.</p>
        <Link
          href="/shop"
          className="rounded-full bg-rose-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-500"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">Your bag</h1>

      <div className="mt-8 flex flex-col gap-6">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex flex-col gap-4 border-b border-black/5 pb-6 dark:border-white/10 sm:flex-row sm:items-center"
          >
            <div className="flex gap-4">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-black/5 text-xs text-foreground/40 dark:bg-white/10">
                  No photo
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:hidden">
                <Link href={`/products/${item.slug}`} className="text-sm font-medium text-foreground hover:underline">
                  {item.name}
                </Link>
                <span className="text-xs text-foreground/50">
                  {[item.size, item.color].filter(Boolean).join(" / ")}
                </span>
                <span className="text-sm text-foreground/70">{formatCurrency(item.price)}</span>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 flex-col gap-1 sm:flex">
              <Link href={`/products/${item.slug}`} className="text-sm font-medium text-foreground hover:underline">
                {item.name}
              </Link>
              <span className="text-xs text-foreground/50">
                {[item.size, item.color].filter(Boolean).join(" / ")}
              </span>
              <span className="text-sm text-foreground/70">{formatCurrency(item.price)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end sm:gap-6">
              <div className="flex items-center gap-3 rounded-md border border-black/10 px-3 py-1.5 dark:border-white/15">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                  aria-label="Decrease quantity"
                  className="text-foreground/60"
                >
                  &minus;
                </button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                  aria-label="Increase quantity"
                  className="text-foreground/60"
                  disabled={item.quantity >= item.stockAtAdd}
                >
                  +
                </button>
              </div>

              <span className="text-right text-sm font-medium text-foreground sm:w-20">
                {formatCurrency(item.price * item.quantity)}
              </span>

              <button
                type="button"
                onClick={() => removeItem(item.key)}
                aria-label={`Remove ${item.name}`}
                className="text-xs font-medium text-foreground/50 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-6 border-t border-black/5 pt-6 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full flex-col gap-4 sm:max-w-xs">
          <AvailableOffers />
          <CouponBox />
        </div>

        <div className="flex w-full flex-col gap-2 sm:max-w-xs">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">Subtotal</span>
            <span className="text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          {appliedCoupon ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Discount</span>
              <span className="text-rose-800">−{formatCurrency(appliedCoupon.discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-black/5 pt-2 text-base font-semibold dark:border-white/10">
            <span className="text-foreground">Estimated total</span>
            <span className="text-foreground">
              {formatCurrency(Math.max(subtotal - (appliedCoupon?.discountAmount ?? 0), 0))}
            </span>
          </div>
          <p className="text-xs text-foreground/50">Shipping calculated at checkout.</p>
          <Link href="/checkout" className={buttonVariants({ variant: "burgundy", className: "mt-2 w-full" })}>
            Proceed to checkout
          </Link>
        </div>
      </div>

      {/* Complementary (not just similar) picks based on what's actually in
          the bag - never auto-added, never changes quantity/price/variant
          of an existing line; clicking one just opens that product's own
          page. Uses the complementary-relationship engine (admin-curated
          picks, falling back to a category relationship), not the general
          similarity one - "Complete your look" should suggest a bag to go
          with the dress in the cart, not another dress. */}
      <div className="mt-16">
        <RecommendationsSection
          seedProductIds={[...new Set(items.map((item) => item.productId))]}
          title="Complete your look"
          endpoint="/api/products/complete-the-look"
        />
      </div>
    </div>
  );
}
