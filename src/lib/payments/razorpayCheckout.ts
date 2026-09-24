// Client-side only - the thin wrapper around Razorpay Checkout's own
// `checkout.js` script (loaded on demand, not bundled/npm-installed; this
// is how Razorpay's own Standard Checkout integration works). Never import
// server-only code here (src/lib/payments/razorpay.ts) - this file ships
// to the browser.

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    reason?: string;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loadPromise: Promise<void> | null = null;

/** Injects Razorpay's checkout.js exactly once per page (subsequent calls
 *  reuse the same in-flight/resolved promise), resolving once
 *  `window.Razorpay` is actually available to construct. */
export function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve();
  }
  if (loadPromise) {
    return loadPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay Checkout")));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.body.appendChild(script);
  }).catch((error: unknown) => {
    // A failed load (offline, ad-blocker, etc.) shouldn't permanently wedge
    // the page into thinking Checkout is loading - let the next attempt
    // retry the script tag instead of reusing a rejected promise forever.
    loadPromise = null;
    throw error;
  });

  loadPromise = promise;
  return promise;
}

/** Loads the script if needed, then opens Checkout with the given options -
 *  the one function CheckoutForm actually calls. `onFailure` covers an
 *  explicit decline (wrong OTP, insufficient funds, etc.) - distinct from
 *  `options.modal.ondismiss`, which covers the visitor just closing the
 *  modal without attempting payment at all. */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
  onFailure?: (response: RazorpayFailureResponse) => void
): Promise<void> {
  await loadRazorpayCheckoutScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout failed to load");
  }
  const instance = new window.Razorpay(options);
  if (onFailure) {
    instance.on("payment.failed", onFailure);
  }
  instance.open();
}
