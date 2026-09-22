"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useAccessibleDialog } from "@/components/ui/useAccessibleDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/home/icons";
import type { AuthResponse } from "@/types/auth";
import type { BackInStockSubscribeResponse } from "@/types/backInStock";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The one "Notify me when available" entry point, shared by the product
 * page and Quick View (both render `AddToCartForm` directly) and Quick Add
 * (`QuickAddSheet`) - so there's exactly one subscribe flow/copy for the
 * whole app. Always carries the exact product + variant id it was rendered
 * for; never a display string like "Black / Medium" (see
 * `subscribeToBackInStock`, which re-validates both server-side anyway).
 */
export function NotifyMeButton({
  productId,
  productName,
  variantId,
  variantLabel,
  className,
}: {
  productId: string;
  productName: string;
  /** Omitted for a product with no variants at all. */
  variantId?: string;
  /** e.g. "Black / M" - display only, never sent to the server. */
  variantLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline-burgundy" onClick={() => setOpen(true)} className={className}>
        Notify me when available
      </Button>
      <NotifyMeModal
        open={open}
        onClose={() => setOpen(false)}
        productId={productId}
        productName={productName}
        variantId={variantId}
        variantLabel={variantLabel}
      />
    </>
  );
}

type Step = "form" | "success" | "already-subscribed";

function NotifyMeModal({
  open,
  onClose,
  productId,
  productName,
  variantId,
  variantLabel,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
}) {
  const { mounted, dialogRef } = useAccessibleDialog<HTMLDivElement>(open, onClose);
  const { showToast } = useToast();

  // "unknown" until the auth check resolves - the email field only ever
  // renders once we're sure this is a guest, so a signed-in customer is
  // never asked to re-type an email they've already given us.
  const [authEmail, setAuthEmail] = useState<string | null | "unknown">("unknown");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("form");
    setFormError(null);
    setEmailError(null);
    setEmail("");
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<AuthResponse>)
      .then((data) => {
        if (cancelled) return;
        setAuthEmail(data.success ? data.user.email : null);
      })
      .catch(() => {
        if (!cancelled) setAuthEmail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const isGuest = authEmail === null;
  const isCheckingAuth = authEmail === "unknown";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setEmailError(null);

    let guestEmail: string | undefined;
    if (isGuest) {
      const trimmed = email.trim();
      if (!EMAIL_PATTERN.test(trimmed)) {
        setEmailError("Please enter a valid email address");
        return;
      }
      guestEmail = trimmed;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/back-in-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, email: guestEmail }),
      });
      const data = (await response.json()) as BackInStockSubscribeResponse;

      if (!data.success) {
        if (data.fieldErrors?.email) {
          setEmailError(data.fieldErrors.email);
        } else {
          setFormError(data.message);
        }
        return;
      }

      setStep(data.alreadySubscribed ? "already-subscribed" : "success");
      showToast({ message: data.alreadySubscribed ? "You're already on the list" : "You're on the list!" });
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[55] bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notify-me-title"
        className="fixed inset-x-0 bottom-0 z-[55] flex max-h-[92vh] flex-col overflow-y-auto rounded-t-lg border-t border-blush-line bg-surface shadow-xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:w-[min(90vw,440px)] sm:rounded-lg sm:border"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blush-line bg-surface px-5 py-4">
          <h2 id="notify-me-title" className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">
            Notify me
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-black/[.04] hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {step === "form" ? (
            <>
              <p className="text-sm text-foreground/70">
                We&apos;ll email you the moment <span className="font-medium text-foreground">{productName}</span>
                {variantLabel ? <> ({variantLabel})</> : null} is back in stock.
              </p>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                {isCheckingAuth ? (
                  <div className="h-11 animate-pulse rounded-md bg-blush" />
                ) : isGuest ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="notify-me-email" className="text-xs font-medium text-foreground">
                      Email address
                    </label>
                    <input
                      id="notify-me-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-11 rounded-md border border-blush-line bg-background px-3.5 text-sm text-foreground outline-none focus:border-rose-800"
                    />
                    {emailError ? <p className="text-xs text-red-500">{emailError}</p> : null}
                  </div>
                ) : null}

                {formError ? <p className="text-xs text-red-500">{formError}</p> : null}

                <Button type="submit" variant="burgundy" disabled={isSubmitting || isCheckingAuth} className="mt-1">
                  {isSubmitting ? "Submitting..." : "Notify me"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground">
                {step === "already-subscribed"
                  ? "You're already on the list for this item - we'll email you as soon as it's back."
                  : "You're on the list! We'll email you the moment it's back in stock."}
              </p>
              <Button type="button" variant="outline-burgundy" onClick={onClose}>
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
