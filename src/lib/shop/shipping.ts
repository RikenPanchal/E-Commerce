// Single source of truth for the delivery-fee calculation - imported by
// both the checkout page's live preview (client) and the order-creation
// API route (server, the actual authoritative charge), so the number a
// customer sees before paying is guaranteed to be the exact number they're
// charged. Never duplicate this logic anywhere else.
//
// Zone rules (based out of Ahmedabad, Gujarat):
//   - Ahmedabad itself           -> free
//   - Rest of Gujarat            -> +Rs 100
//   - Rest of India              -> +Rs 150
//
// Deliberately has zero dependencies (no Mongoose, no Next.js server APIs)
// so it can be safely imported into a "use client" component without
// pulling server-only code into the browser bundle.

export const SHIP_FROM_CITY = "Ahmedabad";
export const SHIP_FROM_STATE = "Gujarat";

export const SHIPPING_RATE_HOME_CITY = 0;
export const SHIPPING_RATE_HOME_STATE = 100;
export const SHIPPING_RATE_REST_OF_INDIA = 150;

export type ShippingZone = "home-city" | "home-state" | "rest-of-india";

/** Case/whitespace-insensitive equality for city/state names - "Ahmedabad",
 *  " ahmedabad ", and "AHMEDABAD" must all resolve to the same zone. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Classifies a delivery address into one of the three shipping zones.
 * Requires BOTH city and state to match for the free "home city" tier -
 * a city named "Ahmedabad" paired with some other state is treated as
 * the state-level tier instead, not the free tier, since that combination
 * can only be a data-entry mistake and free shipping should never be
 * granted on a guess.
 */
export function getShippingZone(address: { city: string; state: string }): ShippingZone {
  const city = normalize(address.city);
  const state = normalize(address.state);
  const homeCity = normalize(SHIP_FROM_CITY);
  const homeState = normalize(SHIP_FROM_STATE);

  if (city === homeCity && state === homeState) {
    return "home-city";
  }
  if (state === homeState) {
    return "home-state";
  }
  return "rest-of-india";
}

const ZONE_RATES: Record<ShippingZone, number> = {
  "home-city": SHIPPING_RATE_HOME_CITY,
  "home-state": SHIPPING_RATE_HOME_STATE,
  "rest-of-india": SHIPPING_RATE_REST_OF_INDIA,
};

/** The actual Rupee amount to charge for delivery to this address. */
export function calculateShippingCost(address: { city: string; state: string }): number {
  return ZONE_RATES[getShippingZone(address)];
}

/** Short label for displaying which zone an address falls into, e.g. next
 *  to the shipping line in an order summary. */
export function describeShippingZone(zone: ShippingZone): string {
  switch (zone) {
    case "home-city":
      return `Free delivery within ${SHIP_FROM_CITY}`;
    case "home-state":
      return `Delivery within ${SHIP_FROM_STATE}`;
    case "rest-of-india":
      return "Delivery across India";
  }
}
