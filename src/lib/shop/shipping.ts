// Single source of truth for the delivery fee - imported by both the
// checkout page's live preview (client) and the order-creation API route
// (server, the actual authoritative charge), so the two can never disagree.
//
// Shipping is free on every order, anywhere in India - no zones, no
// location-based markup. This matches the Shipping Policy page's own
// published promise (src/app/(shop)/shipping/page.tsx: "free shipping on
// every order, anywhere in India... regardless of order value or
// destination"), which the code must actually honor rather than only claim.
//
// Deliberately has zero dependencies (no Mongoose, no Next.js server APIs)
// so it can be safely imported into a "use client" component without
// pulling server-only code into the browser bundle.

export const SHIPPING_COST = 0;

/** Always 0 - shipping is free everywhere. Kept as a function (taking the
 *  same address shape as before) rather than inlining the constant at each
 *  call site, so every caller keeps working unchanged if delivery pricing
 *  is ever revisited. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- address kept in the signature so callers don't change if this is ever revisited
export function calculateShippingCost(address: { city: string; state: string }): number {
  return SHIPPING_COST;
}
