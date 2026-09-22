"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ProductImage } from "@/components/shop/ProductImage";
import { SearchIcon, CloseIcon, ChevronLeftIcon, ArrowRightIcon } from "@/components/home/icons";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/components/ui/cn";
import type { SearchSuggestions } from "@/lib/shop/search";

const RECENT_SEARCHES_KEY = "recentSearches";
const RECENT_SEARCHES_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(terms: string[]): void {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
    // Storage may be unavailable (private browsing, quota) - recent
    // searches just won't persist across visits in that case.
  }
}

type SuggestionItem =
  | { kind: "category"; value: string }
  | { kind: "product"; value: SearchSuggestions["products"][number] }
  | { kind: "viewAll"; value: string };

/**
 * The site's one search entry point - a single icon button that opens a
 * live-suggestion panel (an anchored dropdown on desktop, a full-screen
 * takeover on phones/small tablets via responsive classes on the same
 * markup, not two separate implementations). Replaces the old always-empty
 * `HeaderSearch` expanding input and the plain, suggestion-less search
 * field that used to live in the mobile drawer.
 *
 * The actual result page is still the existing `/shop?q=...` - this only
 * adds a fast preview layer in front of it; submitting (Enter, "View all
 * results", or picking a product/category) always lands on the same real
 * Shop page with the same real filtering/sorting/pagination as before.
 */
export function SmartSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [retryToken, setRetryToken] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ top: number; right: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Portal target (`document.body`) doesn't exist during SSR - same
  // client-only-portal pattern as the shared `Drawer` component.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  function open() {
    const buttonBox = buttonRef.current?.getBoundingClientRect();
    // Anchors the desktop dropdown to the search icon's real position in the
    // viewport - required because the panel is portaled to `document.body`
    // (see the comment on the dialog below for why), so it can no longer
    // rely on a CSS-only `absolute` position relative to a nearby ancestor.
    setAnchorRect(buttonBox ? { top: buttonBox.bottom + 8, right: Math.max(8, window.innerWidth - buttonBox.right) } : null);
    setIsOpen(true);
    setRecentSearches(readRecentSearches());
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function close() {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  // Debounce - only re-fetch suggestions ~300ms after typing pauses, not on
  // every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- kicking off (and
       flagging) a fetch is this effect's entire job; `setStatus`/
       `setSuggestions` after that only ever run from the fetch's own
       callback once real data (or a real failure) exists. */
    setHighlightedIndex(-1);
    if (!isOpen || debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions(null);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then((response) => {
        if (!response.ok) throw new Error("Search request failed");
        return response.json() as Promise<SearchSuggestions>;
      })
      .then((data) => {
        if (cancelled) return;
        setSuggestions(data);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [debouncedQuery, isOpen, retryToken]);

  function rememberSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      RECENT_SEARCHES_LIMIT
    );
    setRecentSearches(next);
    writeRecentSearches(next);
  }

  function removeRecentSearch(term: string) {
    const next = recentSearches.filter((item) => item !== term);
    setRecentSearches(next);
    writeRecentSearches(next);
  }

  function goToResults(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    rememberSearch(trimmed);
    close();
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
  }

  function goToCategory(category: string) {
    close();
    router.push(`/shop?category=${encodeURIComponent(category)}`);
  }

  function goToProduct(slug: string) {
    rememberSearch(query);
    close();
    router.push(`/products/${slug}`);
  }

  const hasQuery = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const items: SuggestionItem[] = hasQuery
    ? [
        ...(suggestions?.categories.map((category) => ({ kind: "category" as const, value: category })) ?? []),
        ...(suggestions?.products.map((product) => ({ kind: "product" as const, value: product })) ?? []),
        ...(suggestions && (suggestions.products.length > 0 || suggestions.categories.length > 0)
          ? [{ kind: "viewAll" as const, value: query }]
          : []),
      ]
    : [];

  function activateItem(item: SuggestionItem) {
    if (item.kind === "category") goToCategory(item.value);
    else if (item.kind === "product") goToProduct(item.value.slug);
    else goToResults(item.value);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (highlightedIndex >= 0 && items[highlightedIndex]) {
      activateItem(items[highlightedIndex]);
    } else {
      goToResults(query);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowDown" && items.length > 0) {
      event.preventDefault();
      setHighlightedIndex((previous) => (previous + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length > 0) {
      event.preventDefault();
      setHighlightedIndex((previous) => (previous - 1 + items.length) % items.length);
    }
  }

  const isEmptyResult =
    hasQuery && status === "idle" && suggestions && suggestions.products.length === 0 && suggestions.categories.length === 0;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={open}
        aria-label="Search"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <SearchIcon className="h-[18px] w-[18px]" />
      </button>

      {isOpen && mounted
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none"
                onClick={close}
                aria-hidden="true"
              />

              {/* Portaled straight to `document.body` rather than rendered
                  in place: the sticky header above uses `backdrop-blur`,
                  and `backdrop-filter` (like `filter`) creates a new
                  containing block for `position: fixed` descendants - a
                  `fixed inset-0` panel left nested inside it would size
                  itself to the *header's* box, not the viewport. Escaping
                  via a portal (the same approach the shared `Drawer`
                  component already uses) means `fixed` genuinely means
                  "relative to the viewport" again; the desktop dropdown's
                  position is computed in `open()` from the search icon's
                  own real position instead of a CSS-relative ancestor. */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Search"
                style={anchorRect ? ({ "--anchor-top": `${anchorRect.top}px`, "--anchor-right": `${anchorRect.right}px` } as CSSProperties) : undefined}
                className="fixed inset-0 z-50 flex flex-col bg-surface sm:inset-auto sm:top-[var(--anchor-top)] sm:right-[var(--anchor-right)] sm:max-h-[75vh] sm:w-[420px] sm:rounded-lg sm:border sm:border-surface-border sm:shadow-xl"
              >
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b border-surface-border p-3 sm:p-4">
              <button type="button" onClick={close} aria-label="Back" className="shrink-0 text-foreground/70 sm:hidden">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>

              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search dresses, tops, collections..."
                  aria-label="Search products"
                  autoComplete="off"
                  className="w-full rounded-md border border-surface-border bg-background py-2.5 pr-8 pl-9 text-sm text-foreground outline-none transition-colors focus:border-rose-500"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="hidden shrink-0 text-foreground/70 transition-colors hover:text-foreground sm:block"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </form>

            <div className="flex-1 overflow-y-auto p-4">
              {!hasQuery ? (
                recentSearches.length > 0 ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                        Recent searches
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRecentSearches([]);
                          writeRecentSearches([]);
                        }}
                        className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
                        Clear all
                      </button>
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {recentSearches.map((term) => (
                        <li key={term} className="group flex items-center justify-between rounded-md hover:bg-background">
                          <button
                            type="button"
                            onClick={() => goToResults(term)}
                            className="flex-1 truncate px-2 py-2 text-left text-sm text-foreground/80 group-hover:text-foreground"
                          >
                            {term}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRecentSearch(term)}
                            aria-label={`Remove "${term}" from recent searches`}
                            className="p-2 text-muted-foreground hover:text-foreground"
                          >
                            <CloseIcon className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Search for products, categories and more.
                  </p>
                )
              ) : status === "loading" && !suggestions ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex animate-pulse items-center gap-3">
                      <div className="h-14 w-11 shrink-0 rounded-sm bg-foreground/[0.06]" />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="h-3 w-3/4 rounded bg-foreground/[0.06]" />
                        <div className="h-3 w-1/3 rounded bg-foreground/[0.06]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : status === "error" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">Search is currently unavailable</p>
                  <p className="text-xs text-muted-foreground">Please try again.</p>
                  <button
                    type="button"
                    onClick={() => setRetryToken((token) => token + 1)}
                    className="text-xs font-medium text-foreground underline underline-offset-4"
                  >
                    Try again
                  </button>
                </div>
              ) : isEmptyResult ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No results for &quot;{query}&quot;</p>
                  <p className="text-xs text-muted-foreground">Try another search or explore our collections.</p>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      router.push("/shop");
                    }}
                    className="mt-1 text-xs font-medium text-foreground underline underline-offset-4"
                  >
                    Shop all
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {suggestions && suggestions.categories.length > 0 ? (
                    <div>
                      <span className="mb-2 block text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                        Category
                      </span>
                      <ul className="flex flex-col gap-0.5">
                        {suggestions.categories.map((category) => {
                          const index = items.findIndex((item) => item.kind === "category" && item.value === category);
                          return (
                            <li key={category}>
                              <button
                                type="button"
                                onClick={() => goToCategory(category)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={cn(
                                  "w-full rounded-md px-2 py-2 text-left text-sm font-medium text-foreground/80",
                                  highlightedIndex === index && "bg-background text-foreground"
                                )}
                              >
                                {category}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {suggestions && suggestions.products.length > 0 ? (
                    <div>
                      <span className="mb-2 block text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                        Products
                      </span>
                      <ul className="flex flex-col gap-1">
                        {suggestions.products.map((product) => {
                          const index = items.findIndex((item) => item.kind === "product" && item.value.id === product.id);
                          const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
                          return (
                            <li key={product.id}>
                              <button
                                type="button"
                                onClick={() => goToProduct(product.slug)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-md p-2 text-left",
                                  highlightedIndex === index && "bg-background"
                                )}
                              >
                                <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-background">
                                  {product.image ? (
                                    <ProductImage
                                      media={[{ id: product.id, type: "image", url: product.image }]}
                                      name={product.name}
                                      className="h-full w-full"
                                    />
                                  ) : null}
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <span className="truncate text-sm font-medium text-foreground">{product.name}</span>
                                  <span className="text-[11px] text-muted-foreground">{product.category}</span>
                                </span>
                                <span className="flex shrink-0 flex-col items-end gap-0.5">
                                  <span className="text-sm font-semibold text-foreground">{formatCurrency(product.price)}</span>
                                  {hasDiscount ? (
                                    <span className="text-[11px] text-muted-foreground line-through">
                                      {formatCurrency(product.compareAtPrice!)}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {suggestions && (suggestions.products.length > 0 || suggestions.categories.length > 0) ? (
                    <button
                      type="button"
                      onClick={() => goToResults(query)}
                      onMouseEnter={() => setHighlightedIndex(items.length - 1)}
                      className={cn(
                        "group flex items-center justify-center gap-2 border-t border-surface-border pt-3 text-xs font-medium tracking-[0.1em] text-foreground uppercase",
                        highlightedIndex === items.length - 1 && "text-rose-600"
                      )}
                    >
                      View all results for &quot;{query}&quot;
                      <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
