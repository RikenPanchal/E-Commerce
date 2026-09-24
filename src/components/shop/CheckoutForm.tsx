"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatCurrency } from "@/lib/utils/currency";
import { calculateShippingCost } from "@/lib/shop/shipping";
import { openRazorpayCheckout } from "@/lib/payments/razorpayCheckout";
import type { OrderResponse, PlaceOrderResponse } from "@/types/order";
import type { AddressView } from "@/types/account";

interface AddressForm {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

function emptyAddressForm(defaultName: string): AddressForm {
  return { fullName: defaultName, phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" };
}

/** Every address field is required except `line2` (apartment/suite - a real
 *  address may genuinely not have one, which is also why its label already
 *  says "(optional)"). Checked client-side first so an empty-form submit
 *  gets an immediate, per-field message instead of waiting on a round trip
 *  to the server (which still re-validates the same way as the ultimate
 *  authority - this is purely for faster, friendlier feedback). */
function validateAddressForm(form: AddressForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.fullName.trim()) errors.fullName = "Full name is required";
  if (!form.phone.trim()) errors.phone = "Phone number is required";
  if (!form.line1.trim()) errors.line1 = "Address is required";
  if (!form.city.trim()) errors.city = "City is required";
  if (!form.state.trim()) errors.state = "State is required";
  if (!form.postalCode.trim()) errors.postalCode = "Postal code is required";
  return errors;
}

export function CheckoutForm({
  defaultName,
  defaultEmail,
  savedAddresses,
}: {
  defaultName: string;
  defaultEmail: string;
  savedAddresses: AddressView[];
}) {
  const router = useRouter();
  const { items, subtotal, isHydrated, clearCart, appliedCoupon, applyCoupon } = useCart();

  const defaultAddress = savedAddresses.find((item) => item.isDefault) ?? savedAddresses[0];
  const [selectedId, setSelectedId] = useState<string | "new">(defaultAddress?.id ?? "new");
  const [address, setAddress] = useState<AddressForm>(emptyAddressForm(defaultName));
  const [saveAddress, setSaveAddress] = useState(savedAddresses.length === 0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed once here (not separately in handleSubmit) so the address used
  // for the silent shipping calculation below is always exactly the same
  // address that gets submitted with the order.
  const selectedSaved = selectedId !== "new" ? savedAddresses.find((item) => item.id === selectedId) : undefined;
  const effectiveCity = selectedSaved?.city ?? address.city;
  const effectiveState = selectedSaved?.state ?? address.state;
  const hasCompleteAddress = effectiveCity.trim().length > 0 && effectiveState.trim().length > 0;

  // Shipping is free everywhere in India (see src/lib/shop/shipping.ts) -
  // computed via the same shared function the server uses for the actual
  // charge, so this preview can never drift from what the order is billed.
  const shippingCost = hasCompleteAddress ? calculateShippingCost({ city: effectiveCity, state: effectiveState }) : 0;

  const total = Math.max(subtotal - (appliedCoupon?.discountAmount ?? 0), 0) + shippingCost;

  function updateField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setAddress((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Only the "new address" form has fields to check - a saved address was
    // already validated in full when it was first added.
    if (!selectedSaved) {
      const errors = validateAddressForm(address);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setFormError("Please fill in all required fields.");
        return;
      }
    }

    setIsSubmitting(true);

    // One last check right before creating the order - the cart could have
    // changed (another tab, a race with the auto-revalidation effect) since
    // this page loaded. `placeOrder` re-validates again regardless, but this
    // catches it here with a clear, specific message instead of a generic
    // order-creation failure.
    if (appliedCoupon) {
      const stillValid = await applyCoupon(appliedCoupon.code);
      if (!stillValid) {
        setFormError("Your coupon is no longer valid and was removed. Please review your order and try again.");
        setIsSubmitting(false);
        return;
      }
    }

    const shippingAddress = selectedSaved
      ? {
          fullName: selectedSaved.fullName,
          phone: selectedSaved.phone,
          line1: selectedSaved.line1,
          line2: selectedSaved.line2,
          city: selectedSaved.city,
          state: selectedSaved.state,
          postalCode: selectedSaved.postalCode,
        }
      : { ...address, line2: address.line2.trim() ? address.line2 : undefined };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          shippingAddress,
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = (await response.json()) as PlaceOrderResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        setIsSubmitting(false);
        return;
      }

      // Best-effort: save a freshly entered address for next time. This
      // never blocks or fails the checkout that already succeeded.
      if (!selectedSaved && saveAddress) {
        fetch("/api/account/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...shippingAddress, isDefault: savedAddresses.length === 0 }),
        }).catch(() => {});
      }

      // Stock is reserved and the Razorpay order exists at this point, but
      // nothing is actually confirmed yet - Checkout opens next, and the
      // order is only ever finalized by verifyPayment below (or, if the
      // browser never gets to report success, the Razorpay webhook).
      const orderId = data.order.id;

      await openRazorpayCheckout(
        {
          key: data.razorpay.keyId,
          amount: data.razorpay.amount,
          currency: data.razorpay.currency,
          order_id: data.razorpay.orderId,
          name: "E-Commerce",
          description: `Order #${orderId.slice(-8).toUpperCase()}`,
          prefill: {
            name: shippingAddress.fullName,
            email: defaultEmail,
            contact: shippingAddress.phone,
          },
          theme: { color: "#e11d48" },
          handler: (paymentResponse) => {
            void verifyPayment(orderId, paymentResponse);
          },
          modal: {
            ondismiss: () => {
              void cancelUnpaidOrder(orderId, "Payment cancelled. Your bag is unchanged - you can try again.");
            },
          },
        },
        (failure) => {
          void cancelUnpaidOrder(
            orderId,
            failure.error.description || "Payment failed. Please try again or use a different payment method."
          );
        }
      );
    } catch {
      setFormError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  /** Razorpay Checkout's own success callback - reports what the customer
   *  just paid, never trusted as-is (the server re-derives and checks the
   *  signature before marking anything paid). */
  async function verifyPayment(
    orderId: string,
    response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  ) {
    try {
      const verifyResponse = await fetch(`/api/orders/${orderId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      });
      const data = (await verifyResponse.json()) as OrderResponse;
      if (!data.success) {
        setFormError(`${data.message} Your order is saved as #${orderId.slice(-8).toUpperCase()} - contact us if you need help.`);
        setIsSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/orders/${orderId}`);
    } catch {
      setFormError(
        `We couldn't confirm your payment just now. Your order is saved as #${orderId.slice(-8).toUpperCase()} - check "My orders" in a moment, or contact us if it doesn't update.`
      );
      setIsSubmitting(false);
    }
  }

  /** Releases the order's reserved stock after a dismissed/failed payment
   *  attempt - best-effort from the client's side (the Razorpay webhook and
   *  the stale-checkout cleanup job both also cover this independently),
   *  so its own failure only logs rather than blocking the retry message. */
  async function cancelUnpaidOrder(orderId: string, message: string) {
    setFormError(message);
    setIsSubmitting(false);
    try {
      await fetch(`/api/orders/${orderId}/cancel-payment`, { method: "POST" });
    } catch (error) {
      console.error(`Failed to release stock for unpaid order ${orderId}:`, error);
    }
  }

  if (isHydrated && items.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-foreground/60">Your bag is empty, so there&apos;s nothing to check out.</p>
        <Link
          href="/shop"
          className="rounded-full bg-rose-600 px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-rose-500"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Shipping address</h2>

        {savedAddresses.length > 0 ? (
          <div className="flex flex-col gap-2">
            {savedAddresses.map((saved) => (
              <label
                key={saved.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                  selectedId === saved.id
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                    : "border-black/10 dark:border-white/15"
                }`}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  checked={selectedId === saved.id}
                  onChange={() => setSelectedId(saved.id)}
                  className="mt-1 accent-rose-600"
                />
                <span className="text-foreground/80">
                  <span className="font-medium text-foreground">{saved.label || "Address"}</span>
                  {saved.isDefault ? " · Default" : ""}
                  <br />
                  {saved.fullName}, {saved.line1}
                  {saved.line2 ? `, ${saved.line2}` : ""}, {saved.city}, {saved.state} {saved.postalCode}
                </span>
              </label>
            ))}
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                selectedId === "new"
                  ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                  : "border-black/10 dark:border-white/15"
              }`}
            >
              <input
                type="radio"
                name="savedAddress"
                checked={selectedId === "new"}
                onChange={() => setSelectedId("new")}
                className="accent-rose-600"
              />
              <span className="font-medium text-foreground">Use a new address</span>
            </label>
          </div>
        ) : null}

        {selectedId === "new" ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="fullName"
                label="Full name"
                value={address.fullName}
                onChange={(value) => updateField("fullName", value)}
                error={fieldErrors.fullName}
              />
              <Field
                id="phone"
                label="Phone"
                value={address.phone}
                onChange={(value) => updateField("phone", value)}
                error={fieldErrors.phone}
              />
            </div>

            <Field
              id="line1"
              label="Address"
              value={address.line1}
              onChange={(value) => updateField("line1", value)}
              error={fieldErrors.line1}
            />
            <Field
              id="line2"
              label="Apartment, suite, etc. (optional)"
              value={address.line2}
              onChange={(value) => updateField("line2", value)}
              required={false}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                id="city"
                label="City"
                value={address.city}
                onChange={(value) => updateField("city", value)}
                error={fieldErrors.city}
              />
              <Field
                id="state"
                label="State"
                value={address.state}
                onChange={(value) => updateField("state", value)}
                error={fieldErrors.state}
              />
              <Field
                id="postalCode"
                label="Postal code"
                value={address.postalCode}
                onChange={(value) => updateField("postalCode", value)}
                error={fieldErrors.postalCode}
              />
            </div>

            <label className="flex w-fit items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
                className="accent-rose-600"
              />
              Save this address for next time
            </label>
          </>
        ) : null}

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || items.length === 0}
          className="mt-2 w-fit rounded-full bg-rose-600 px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
        >
          {isSubmitting ? "Opening secure checkout..." : `Pay ${formatCurrency(total)}`}
        </button>
        <p className="text-xs text-foreground/50">
          You&apos;ll pay securely via Razorpay - UPI, cards, netbanking and wallets are all supported. No cash on
          delivery.
        </p>
      </form>

      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 p-5 shadow-sm dark:border-white/10 dark:shadow-none">
        <h2 className="text-sm font-semibold text-foreground">Order summary</h2>
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between text-sm">
              <span className="text-foreground/70">
                {item.name} &times; {item.quantity}
              </span>
              <span className="text-foreground">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Coupons are picked on the Cart page (every route here - including
            "Buy now" - goes through it), so checkout only summarizes the
            result instead of repeating the full offer list and code input. */}
        <div className="border-t border-black/5 pt-3 dark:border-white/10">
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-blush-line bg-blush px-4 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-rose-400 uppercase">{appliedCoupon.code}</span>
                <span className="text-xs text-foreground/60">Coupon applied</span>
              </div>
              <Link
                href="/cart"
                className="shrink-0 text-xs font-medium text-foreground/60 underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Change
              </Link>
            </div>
          ) : (
            <p className="text-xs text-foreground/60">
              Have a coupon?{" "}
              <Link href="/cart" className="font-medium text-rose-400 underline underline-offset-4 hover:text-rose-300">
                Apply it in your bag
              </Link>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-black/5 pt-3 dark:border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70">Subtotal</span>
            <span className="text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          {appliedCoupon ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/70">Discount</span>
              <span className="text-rose-400">−{formatCurrency(appliedCoupon.discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70">Shipping</span>
            <span className="font-medium text-green-700 dark:text-green-400">Free</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Every address field is required by default - `line2` (apartment/suite)
   *  is the one call site that opts out, since its label already says
   *  "(optional)" and a real address may genuinely not have one. */
  required?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-rose-400 ${
          error ? "border-red-400" : "border-black/10 dark:border-white/15"
        }`}
      />
      {error ? (
        <p id={errorId} className="text-xs text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
