"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/ToastProvider";

const GUEST_STORAGE_KEY = "wishlist:guest";

function storageKeyFor(userId: string | null): string {
  return userId ? `wishlist:${userId}` : GUEST_STORAGE_KEY;
}

function readWishlist(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeWishlist(key: string, ids: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage may be unavailable (private browsing, quota) - the wishlist
    // just won't persist across reloads in that case.
  }
}

interface WishlistContextValue {
  productIds: string[];
  count: number;
  isHydrated: boolean;
  has: (productId: string) => boolean;
  /** Adds or removes a product, and shows a quick toast either way
   *  ("Removed" includes an Undo). `productName` is only for that toast's
   *  wording - the wishlist itself only ever stores ids. */
  toggle: (productId: string, productName?: string) => void;
  /** Unconditional removal, no toast - for cleaning up ids that no longer
   *  resolve to a real product (`WishlistView` calls this once a fetch
   *  confirms one is gone), not a user-initiated action worth announcing. */
  remove: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * A saved-for-later list of product ids, stored the same way `CartProvider`
 * stores the cart (per-account localStorage, guest items folded in on
 * sign-in) - no dedicated backend/model, matching how this app already
 * treats "cart" as real, working, persisted functionality without a server
 * round trip. Only ids are kept; the wishlist page fetches each product's
 * current live data rather than a stale snapshot.
 */
export function WishlistProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const { showToast } = useToast();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const activeKeyRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap
       read of an external store (localStorage), and reacting to `userId`
       (sign-in/out) swapping which identity's wishlist is active; both are
       necessary exceptions, not incidental setState calls. Mirrors
       `CartProvider`'s identical justification. */
    const nextKey = storageKeyFor(userId);
    const previousUserId = previousUserIdRef.current;
    const isFirstRun = previousUserId === undefined;

    if (isFirstRun) {
      activeKeyRef.current = nextKey;
      setProductIds(readWishlist(nextKey));
    } else if (previousUserId !== userId) {
      if (previousUserId === null && userId) {
        // Guest -> signed in: fold in whatever they wishlisted before
        // logging in, then clear the guest slot.
        const guestIds = readWishlist(GUEST_STORAGE_KEY);
        const accountIds = readWishlist(nextKey);
        const merged = [...new Set([...accountIds, ...guestIds])];
        writeWishlist(nextKey, merged);
        window.localStorage.removeItem(GUEST_STORAGE_KEY);
        activeKeyRef.current = nextKey;
        setProductIds(merged);
      } else {
        if (userId === null) {
          window.localStorage.removeItem(GUEST_STORAGE_KEY);
        }
        activeKeyRef.current = nextKey;
        setProductIds(readWishlist(nextKey));
      }
    }

    previousUserIdRef.current = userId;
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [userId]);

  useEffect(() => {
    if (!isHydrated || !activeKeyRef.current) return;
    writeWishlist(activeKeyRef.current, productIds);
  }, [productIds, isHydrated]);

  function has(productId: string): boolean {
    return productIds.includes(productId);
  }

  function toggle(productId: string, productName?: string) {
    const isRemoving = productIds.includes(productId);
    const label = productName ?? "Item";
    setProductIds((previous) =>
      isRemoving ? previous.filter((id) => id !== productId) : [...previous, productId]
    );

    if (isRemoving) {
      showToast({
        message: `Removed ${label} from wishlist`,
        action: {
          label: "Undo",
          onClick: () =>
            setProductIds((current) => (current.includes(productId) ? current : [...current, productId])),
        },
      });
    } else {
      showToast({ message: `Added ${label} to wishlist` });
    }
  }

  function remove(productId: string) {
    setProductIds((previous) => previous.filter((id) => id !== productId));
  }

  const value: WishlistContextValue = {
    productIds,
    count: productIds.length,
    isHydrated,
    has,
    toggle,
    remove,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
