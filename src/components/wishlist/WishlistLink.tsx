"use client";

import Link from "next/link";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { HeartIcon } from "@/components/home/icons";

export function WishlistLink() {
  const { count, isHydrated } = useWishlist();

  return (
    <Link
      href="/wishlist"
      aria-label={`View wishlist${isHydrated && count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <HeartIcon className="h-[19px] w-[19px]" />
      {isHydrated && count > 0 ? (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
