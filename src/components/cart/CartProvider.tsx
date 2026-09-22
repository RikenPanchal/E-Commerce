"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { makeCartKey, type CartItem } from "@/types/cart";
import type { ApplyCouponResponse, AppliedCoupon } from "@/types/coupon";

const GUEST_STORAGE_KEY = "cart:guest";
const GUEST_COUPON_STORAGE_KEY = "coupon:guest";

function storageKeyFor(userId: string | null): string {
  return userId ? `cart:${userId}` : GUEST_STORAGE_KEY;
}

function couponStorageKeyFor(userId: string | null): string {
  return userId ? `coupon:${userId}` : GUEST_COUPON_STORAGE_KEY;
}

function readCoupon(key: string): AppliedCoupon | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as AppliedCoupon) : null;
  } catch {
    return null;
  }
}

function writeCoupon(key: string, coupon: AppliedCoupon | null): void {
  try {
    if (coupon) {
      window.localStorage.setItem(key, JSON.stringify(coupon));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable - the applied coupon just won't survive a reload.
  }
}

function readCart(key: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(key: string, items: CartItem[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage may be unavailable (private browsing, quota) - the cart just
    // won't persist across reloads in that case.
  }
}

/** Combines two carts line-by-line, summing quantities (capped to the larger known stock). */
function mergeCarts(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = new Map(base.map((item) => [item.key, item]));
  for (const item of incoming) {
    const existing = merged.get(item.key);
    merged.set(
      item.key,
      existing
        ? {
            ...existing,
            quantity: Math.min(
              existing.quantity + item.quantity,
              Math.max(existing.stockAtAdd, item.stockAtAdd),
            ),
          }
        : item,
    );
  }
  return [...merged.values()];
}

export interface AddToCartInput {
  productId: string;
  /** The resolved variant's id, when the product uses the variant system. */
  variantId?: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  size?: string;
  color?: string;
  sku?: string;
  quantity: number;
  stock: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isHydrated: boolean;
  addItem: (input: AddToCartInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  /** The one shared coupon state - applying it on the Cart page keeps it
   *  applied on Checkout, and vice versa, since both read this same context. */
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  isApplyingCoupon: boolean;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * `userId` is the signed-in account's id (or `null` for a guest), passed down
 * from the root layout's server-side session check. Each account gets its
 * own cart in localStorage - switching accounts on the same browser must
 * never leak one person's cart into another's.
 */
export function CartProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | null;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const activeKeyRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  // Ignores a stale response from an earlier, now-superseded apply/revalidate
  // call (e.g. cart changed again before the first request returned).
  const couponRequestIdRef = useRef(0);

  // Cart lives in localStorage, an external store React can't read during
  // SSR or the initial client render without a hydration mismatch - this
  // effect is the standard, necessary exception to react-hooks/set-state-in-effect
  // for exactly that reason. It also reacts to `userId` changing (sign-in,
  // sign-out, or switching accounts) by swapping to that identity's own cart.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap
       read of an external store (localStorage), and reacting to `userId`
       (sign-in/out) swapping which identity's cart is active; both are
       necessary exceptions, not incidental setState calls. */
    const nextKey = storageKeyFor(userId);
    const previousUserId = previousUserIdRef.current;
    const isFirstRun = previousUserId === undefined;

    const nextCouponKey = couponStorageKeyFor(userId);

    if (isFirstRun) {
      // Fresh page load - just load whichever cart matches who's signed in
      // right now. Nothing to merge; there's no "previous identity" this tab
      // has seen yet.
      activeKeyRef.current = nextKey;
      setItems(readCart(nextKey));
      setAppliedCoupon(readCoupon(nextCouponKey));
    } else if (previousUserId !== userId) {
      if (previousUserId === null && userId) {
        // Guest -> signed in: fold whatever they added before logging in
        // into their account's cart, then clear the guest slot so the next
        // anonymous visitor on this browser doesn't inherit it. A coupon
        // the guest had applied carries over the same way (falls back to
        // whatever the account itself already had applied, if anything).
        const guestItems = readCart(GUEST_STORAGE_KEY);
        const accountItems = readCart(nextKey);
        const merged = mergeCarts(accountItems, guestItems);
        writeCart(nextKey, merged);
        window.localStorage.removeItem(GUEST_STORAGE_KEY);
        activeKeyRef.current = nextKey;
        setItems(merged);

        const guestCoupon = readCoupon(GUEST_COUPON_STORAGE_KEY);
        const carriedCoupon = guestCoupon ?? readCoupon(nextCouponKey);
        if (guestCoupon) writeCoupon(nextCouponKey, guestCoupon);
        window.localStorage.removeItem(GUEST_COUPON_STORAGE_KEY);
        setAppliedCoupon(carriedCoupon);
        setCouponError(null);
      } else {
        // Signed out, or switched from one account straight to another:
        // never carry a cart (or an applied coupon) across identities.
        // Signing out also wipes the guest slots, so whoever uses this
        // browser next starts empty too.
        if (userId === null) {
          window.localStorage.removeItem(GUEST_STORAGE_KEY);
          window.localStorage.removeItem(GUEST_COUPON_STORAGE_KEY);
        }
        activeKeyRef.current = nextKey;
        setItems(readCart(nextKey));
        setAppliedCoupon(readCoupon(nextCouponKey));
        setCouponError(null);
      }
    }

    previousUserIdRef.current = userId;
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [userId]);

  useEffect(() => {
    if (!isHydrated || !activeKeyRef.current) return;
    writeCart(activeKeyRef.current, items);
  }, [items, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    writeCoupon(couponStorageKeyFor(userId), appliedCoupon);
  }, [appliedCoupon, isHydrated, userId]);

  /** Re-validates the applied coupon against real backend rules - always
   *  after cart contents change (quantity edited, item added/removed), so a
   *  coupon that no longer qualifies (minimum order no longer met, its only
   *  eligible item was removed, etc.) never keeps showing a stale discount.
   *  Runs the exact same server-side check `applyCoupon` does; on failure it
   *  clears the coupon and surfaces the real reason, it never guesses. */
  useEffect(() => {
    if (!isHydrated || !appliedCoupon) return;
    const code = appliedCoupon.code;
    const requestId = ++couponRequestIdRef.current;

    if (items.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppliedCoupon(null);
      setCouponError(null);
      return;
    }

    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      }),
    })
      .then((response) => response.json() as Promise<ApplyCouponResponse>)
      .then((data) => {
        if (couponRequestIdRef.current !== requestId) return; // Superseded by a newer change.
        if (!data.success) {
          setAppliedCoupon(null);
          setCouponError(`"${code}" no longer applies: ${data.message}`);
          return;
        }
        // Only the discount amount can legitimately drift (cart total
        // changed) - if the code somehow differs, ignore rather than swap.
        if (data.coupon.code === code) {
          setAppliedCoupon(data.coupon);
        }
      })
      .catch(() => {
        // A network hiccup shouldn't silently drop a valid coupon - leave it
        // applied as-is; the next real change (or checkout submission, which
        // re-validates again) will retry.
      });
    // Only re-run when the cart's actual contents change or the applied
    // coupon's code changes - not on every `appliedCoupon` object identity
    // change (this effect itself is what produces those).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isHydrated, appliedCoupon?.code]);

  async function applyCoupon(code: string): Promise<boolean> {
    const trimmed = code.trim();
    if (!trimmed) return false;

    setCouponError(null);
    setIsApplyingCoupon(true);
    const requestId = ++couponRequestIdRef.current;
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmed,
          items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
        }),
      });
      const data = (await response.json()) as ApplyCouponResponse;
      if (couponRequestIdRef.current !== requestId) return false;

      if (!data.success) {
        setCouponError(data.message);
        return false;
      }
      setAppliedCoupon(data.coupon);
      return true;
    } catch {
      if (couponRequestIdRef.current === requestId) {
        setCouponError("Something went wrong. Please try again.");
      }
      return false;
    } finally {
      if (couponRequestIdRef.current === requestId) {
        setIsApplyingCoupon(false);
      }
    }
  }

  function removeCoupon() {
    couponRequestIdRef.current += 1; // Discard any in-flight apply/revalidate.
    setAppliedCoupon(null);
    setCouponError(null);
    setIsApplyingCoupon(false);
  }

  function addItem(input: AddToCartInput) {
    const key = makeCartKey(input.productId, input.size, input.color, input.variantId);
    setItems((previous) => {
      const existing = previous.find((item) => item.key === key);
      if (existing) {
        const nextQuantity = Math.min(
          existing.quantity + input.quantity,
          input.stock,
        );
        return previous.map((item) =>
          item.key === key ? { ...item, quantity: nextQuantity } : item,
        );
      }
      return [
        ...previous,
        {
          key,
          productId: input.productId,
          variantId: input.variantId,
          slug: input.slug,
          name: input.name,
          price: input.price,
          image: input.image,
          size: input.size,
          color: input.color,
          sku: input.sku,
          quantity: Math.min(input.quantity, input.stock),
          stockAtAdd: input.stock,
        },
      ];
    });
  }

  function updateQuantity(key: string, quantity: number) {
    setItems((previous) =>
      previous
        .map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: Math.max(1, Math.min(quantity, item.stockAtAdd)),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(key: string) {
    setItems((previous) => previous.filter((item) => item.key !== key));
  }

  function clearCart() {
    setItems([]);
    couponRequestIdRef.current += 1; // Discard any in-flight apply/revalidate.
    setAppliedCoupon(null);
    setCouponError(null);
  }

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const value: CartContextValue = {
    items,
    totalItems,
    subtotal,
    isHydrated,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    appliedCoupon,
    couponError,
    isApplyingCoupon,
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
