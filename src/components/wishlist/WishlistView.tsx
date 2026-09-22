"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { buttonVariants } from "@/components/ui/Button";
import { HeartIcon } from "@/components/home/icons";
import type { ProductWithRating, ProductsPageResponse } from "@/app/api/products/route";

const GRID_CLASSES = "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6";

/**
 * Fetches the wishlist's saved products' *current* live data (price, stock,
 * rating - never a stale snapshot from whenever each item was added) once
 * the ids are known from `WishlistProvider`'s localStorage. Removing an item
 * (the heart on its own `ProductCard`) is reflected instantly by filtering
 * the already-fetched list against the provider's current ids, rather than
 * re-fetching the whole set over the network.
 *
 * Two things the plain "fetch and render" version didn't handle: a failed
 * fetch left the page silently showing zero products with no explanation,
 * and a product deleted from the catalog stayed in the wishlist forever
 * (never appearing, but still inflating the header's count) - both fixed
 * below.
 */
export function WishlistView() {
  const { productIds, isHydrated, remove } = useWishlist();
  const [fetchedProducts, setFetchedProducts] = useState<ProductWithRating[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- kicking off (and
       flagging) a fetch is this effect's entire job; the other setState
       calls only ever run from the fetch's own callback, once a real
       result (success or failure) exists. */
    if (!isHydrated) return;
    if (productIds.length === 0) {
      setStatus("success");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/products/by-ids?ids=${productIds.map(encodeURIComponent).join(",")}`)
      .then((response) => {
        if (!response.ok) throw new Error("Request failed");
        return response.json() as Promise<ProductsPageResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setFetchedProducts(data.products);
        setStatus("success");
        // A wishlisted id that no longer resolves to a real product (the
        // catalog item was deleted) silently drops off the visible list -
        // clean it out of the underlying wishlist too, rather than letting
        // it inflate the header's count forever.
        const returnedIds = new Set(data.products.map((product) => product.id));
        for (const id of productIds) {
          if (!returnedIds.has(id)) remove(id);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
    // Re-fetch only when the actual set of ids changes (or a retry is
    // requested), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, productIds.join(","), retryToken]);

  const products = fetchedProducts.filter((product) => productIds.includes(product.id));

  const breadcrumb = (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-foreground">Wishlist</span>
        </nav>
      </div>
    </div>
  );

  if (isHydrated && productIds.length === 0) {
    return (
      <div className="flex flex-col">
        {breadcrumb}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-20 text-center sm:py-24">
          <HeartIcon className="h-8 w-8 text-rose-400" />
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground">Your wishlist is empty</h1>
          <p className="text-sm text-muted-foreground">Save the styles you love and come back to them anytime.</p>
          <Link href="/shop" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-2" })}>
            Explore shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {breadcrumb}
      <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-8">
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">Your wishlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "loading" && products.length === 0
            ? "Loading your saved styles."
            : `${products.length} saved ${products.length === 1 ? "style" : "styles"}.`}
        </p>

        {status === "error" ? (
          <div className="mx-auto mt-12 flex max-w-sm flex-col items-center gap-3 py-8 text-center">
            <p className="font-serif text-lg font-semibold text-foreground">Unable to load your wishlist</p>
            <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className={buttonVariants({ variant: "primary", className: "mt-1" })}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className={`mt-8 ${GRID_CLASSES}`}>
            {status === "loading" && products.length === 0
              ? Array.from({ length: Math.min(productIds.length, 4) || 4 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))
              : products.map((product) => <ProductCard key={product.id} product={product} rating={product.rating} />)}
          </div>
        )}
      </div>
    </div>
  );
}
