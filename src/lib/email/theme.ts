// Shared look for every transactional email (order confirmation, password
// reset). The storefront's own Black + Champagne tokens (src/app/globals.css)
// - hardcoded here rather than read from CSS, since email HTML can't
// reference the app's CSS variables and needs literal hex values inlined per
// element. Keep these in sync by hand whenever the site's own palette
// changes - there's no automated link between the two.
export const BRAND_NAME = "E-Commerce";
export const PAGE_BG = "#0b0b0b"; // --background (Black)
export const CARD_BG = "#1c1c1c"; // --surface (Card)
export const ACCENT = "#d6b77c"; // --color-rose-400 (Champagne)
export const ACCENT_DARK = "#171310"; // --burgundy (deep bronze-black panel)
export const BORDER = "#2a2620"; // --surface-border
export const MUTED_TEXT = "#a8a29a"; // --muted-foreground (Muted)
export const TEXT = "#f5f0e6"; // --foreground (Ivory)

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
