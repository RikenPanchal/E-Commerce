"use client";

import type { SVGProps } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

function BagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path
        d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5L6 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CartLink() {
  const { totalItems, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`View cart${isHydrated && totalItems > 0 ? `, ${totalItems} item${totalItems === 1 ? "" : "s"}` : ""}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <BagIcon className="h-[19px] w-[19px]" />
      {isHydrated && totalItems > 0 ? (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
          {totalItems}
        </span>
      ) : null}
    </Link>
  );
}
