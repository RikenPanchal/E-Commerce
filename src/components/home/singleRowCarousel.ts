/**
 * Shared by every homepage section that shows a single, non-scrolling row
 * of cards (Best Sellers, New Arrivals, Picked for You): exactly enough
 * cards are ever rendered to fill one row at the current breakpoint (2 on
 * phones, 3 from `sm`, 4 from `md`, 5 from `lg`) via a fixed column grid
 * sized to that count, with the rest hidden by breakpoint rather than
 * wrapped to a second row or left to scroll.
 *
 * Deliberately a plain module with no "use client" directive - the
 * client-side sections import `CARD_VISIBILITY` to hide the extra cards,
 * and their Server Component data-fetching wrappers import
 * `SINGLE_ROW_CARD_LIMIT` to only fetch as many as will ever be shown.
 * Re-exporting this constant from a "use client" file for a Server
 * Component to import doesn't work the way a plain number import does -
 * Next.js turns every export of a client module into a client reference,
 * which breaks as soon as server code tries to use it in arithmetic (a
 * real bug this file's own existence fixes).
 */
export const CARD_VISIBILITY = ["", "", "hidden sm:block", "hidden md:block", "hidden lg:block"];
export const SINGLE_ROW_CARD_LIMIT = CARD_VISIBILITY.length;
