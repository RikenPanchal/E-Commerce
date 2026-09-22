"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  message: string;
  action?: ToastAction;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION_MS = 3500;

/**
 * A single, app-wide toast slot - there's no existing notification system
 * anywhere in the codebase to reuse, so this is the one built for it,
 * kept deliberately small (one message at a time, no queue) rather than a
 * full notification library. Used for quick, non-blocking feedback
 * ("Added to wishlist", "Removed from wishlist" with an Undo) instead of
 * confirmation dialogs.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const id = Date.now();
    setToast({ ...options, id });
    timeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, options.durationMs ?? DEFAULT_DURATION_MS);
  }, []);

  function dismiss() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-md bg-foreground px-4 py-3 text-sm text-background shadow-lg">
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss();
                }}
                className="shrink-0 font-semibold text-rose-300 underline underline-offset-4 transition-colors hover:text-rose-200"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss notification"
              className="shrink-0 text-background/60 transition-colors hover:text-background"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
