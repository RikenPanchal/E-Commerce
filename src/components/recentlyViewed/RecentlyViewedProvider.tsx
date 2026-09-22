"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MAX_RECENTLY_VIEWED, type RecentlyViewedEntry } from "@/types/recentlyViewed";

const GUEST_STORAGE_KEY = "recentlyViewed:guest";

function storageKeyFor(userId: string | null): string {
  return userId ? `recentlyViewed:${userId}` : GUEST_STORAGE_KEY;
}

function isValidEntry(value: unknown): value is RecentlyViewedEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RecentlyViewedEntry).productId === "string" &&
    typeof (value as RecentlyViewedEntry).viewedAt === "number"
  );
}

function readEntries(key: string): RecentlyViewedEntry[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Malformed/corrupted data (a hand-edited value, a future format
    // change) is dropped rather than thrown - only this one key's data is
    // lost, nothing else in storage is touched.
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function writeEntries(key: string, entries: RecentlyViewedEntry[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Storage may be unavailable (private browsing, quota) - history just
    // won't persist across reloads in that case.
  }
}

/** Newest first, deduplicated by product, capped at the configured max. */
function normalize(entries: RecentlyViewedEntry[]): RecentlyViewedEntry[] {
  const byProduct = new Map<string, RecentlyViewedEntry>();
  for (const entry of entries) {
    const existing = byProduct.get(entry.productId);
    if (!existing || entry.viewedAt > existing.viewedAt) {
      byProduct.set(entry.productId, entry);
    }
  }
  return [...byProduct.values()]
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .slice(0, MAX_RECENTLY_VIEWED);
}

interface RecentlyViewedContextValue {
  /** Newest first. */
  productIds: string[];
  isHydrated: boolean;
  /** Records a view - moves the product to the front if already present,
   *  otherwise adds it, then trims to `MAX_RECENTLY_VIEWED`. */
  track: (productId: string) => void;
  /** Removes one entry - browsing history only, never touches the product,
   *  the wishlist, or the cart. */
  remove: (productId: string) => void;
  clear: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);

/**
 * Local browsing history - which products this browser/account has opened
 * the detail page for, most recent first. Stores only `{productId,
 * viewedAt}` pairs, never a snapshot of the product itself: prices, stock,
 * and images can change after a view, and `RecentlyViewedSection` always
 * resolves current data for these ids through the real product API rather
 * than trusting anything cached here. Persisted the same way `CartProvider`/
 * `WishlistProvider` persist theirs - per-account localStorage, guest
 * history folded in on sign-in - so this is one more instance of an
 * already-established pattern, not a new persistence mechanism.
 */
export function RecentlyViewedProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const activeKeyRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap
       read of an external store (localStorage), and reacting to `userId`
       (sign-in/out) swapping which identity's history is active; both are
       necessary exceptions, not incidental setState calls. Mirrors
       `CartProvider`/`WishlistProvider`'s identical justification. */
    const nextKey = storageKeyFor(userId);
    const previousUserId = previousUserIdRef.current;
    const isFirstRun = previousUserId === undefined;

    if (isFirstRun) {
      activeKeyRef.current = nextKey;
      setEntries(readEntries(nextKey));
    } else if (previousUserId !== userId) {
      if (previousUserId === null && userId) {
        // Guest -> signed in: fold in whatever they viewed before logging
        // in, then clear the guest slot so the next anonymous visitor on
        // this browser doesn't inherit it.
        const guestEntries = readEntries(GUEST_STORAGE_KEY);
        const accountEntries = readEntries(nextKey);
        const merged = normalize([...accountEntries, ...guestEntries]);
        writeEntries(nextKey, merged);
        window.localStorage.removeItem(GUEST_STORAGE_KEY);
        activeKeyRef.current = nextKey;
        setEntries(merged);
      } else {
        // Signed out, or switched from one account straight to another:
        // never carry history across identities.
        if (userId === null) {
          window.localStorage.removeItem(GUEST_STORAGE_KEY);
        }
        activeKeyRef.current = nextKey;
        setEntries(readEntries(nextKey));
      }
    }

    previousUserIdRef.current = userId;
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [userId]);

  useEffect(() => {
    if (!isHydrated || !activeKeyRef.current) return;
    writeEntries(activeKeyRef.current, entries);
  }, [entries, isHydrated]);

  function track(productId: string) {
    setEntries((previous) => normalize([{ productId, viewedAt: Date.now() }, ...previous]));
  }

  function remove(productId: string) {
    setEntries((previous) => previous.filter((entry) => entry.productId !== productId));
  }

  function clear() {
    setEntries([]);
  }

  const value: RecentlyViewedContextValue = {
    productIds: entries.map((entry) => entry.productId),
    isHydrated,
    track,
    remove,
    clear,
  };

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

export function useRecentlyViewed(): RecentlyViewedContextValue {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error("useRecentlyViewed must be used within a RecentlyViewedProvider");
  }
  return context;
}
