import { formatCurrency } from "@/lib/utils/currency";
import { sendMail } from "@/lib/email/mailer";
import type { OrderView } from "@/types/order";

const BRAND_NAME = "E-Commerce";
// The storefront's own Black + Champagne tokens (src/app/globals.css) -
// hardcoded here rather than read from CSS, since email HTML can't
// reference the app's CSS variables and needs literal hex values inlined
// per element. Keep these in sync by hand whenever the site's own palette
// changes - there's no automated link between the two.
const PAGE_BG = "#0b0b0b"; // --background (Black)
const CARD_BG = "#1c1c1c"; // --surface (Card)
const ACCENT = "#d6b77c"; // --color-rose-400 (Champagne)
const ACCENT_DARK = "#171310"; // --burgundy (deep bronze-black panel)
const BORDER = "#2a2620"; // --surface-border
const MUTED_TEXT = "#a8a29a"; // --muted-foreground (Muted)
const TEXT = "#f5f0e6"; // --foreground (Ivory)

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemRowHtml(item: OrderView["items"][number]): string {
  const variant = [item.size, item.color].filter(Boolean).join(" / ");
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT};">
        ${escapeHtml(item.name)}
        ${variant ? `<div style="font-size:12px;color:${MUTED_TEXT};margin-top:2px;">${escapeHtml(variant)}</div>` : ""}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED_TEXT};text-align:center;">
        &times;${item.quantity}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT};text-align:right;white-space:nowrap;">
        ${formatCurrency(item.price * item.quantity)}
      </td>
    </tr>`;
}

function itemRowText(item: OrderView["items"][number]): string {
  const variant = [item.size, item.color].filter(Boolean).join(" / ");
  return `  - ${item.name}${variant ? ` (${variant})` : ""} x${item.quantity} - ${formatCurrency(item.price * item.quantity)}`;
}

/** Builds the order-confirmation "bill" email - subject/html/text - from a
 *  real, already-placed order. Every figure here is read straight off the
 *  order document itself (never recomputed), so the email always matches
 *  exactly what the customer was charged. */
export function buildOrderConfirmationEmail(order: OrderView, customerName: string) {
  const orderNumber = order.id.slice(-8).toUpperCase();
  const subject = `Your ${BRAND_NAME} order #${orderNumber} is confirmed`;
  const address = order.shippingAddress;

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${CARD_BG};border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
            <tr>
              <td style="background-color:${ACCENT_DARK};padding:28px 32px;text-align:center;border-bottom:2px solid ${ACCENT};">
                <span style="color:${TEXT};font-size:20px;letter-spacing:2px;text-transform:uppercase;">${BRAND_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${ACCENT};font-family:Arial,sans-serif;">Order confirmed</p>
                <h1 style="margin:6px 0 0 0;font-size:24px;color:${TEXT};">Thank you, ${escapeHtml(customerName)}!</h1>
                <p style="margin:10px 0 0 0;font-size:14px;color:${MUTED_TEXT};font-family:Arial,sans-serif;">
                  Order #${orderNumber} &middot; Placed ${dateFormatter.format(new Date(order.createdAt))}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">
                  <tr>
                    <th style="text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED_TEXT};border-bottom:2px solid ${ACCENT};padding-bottom:8px;">Item</th>
                    <th style="text-align:center;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED_TEXT};border-bottom:2px solid ${ACCENT};padding-bottom:8px;">Qty</th>
                    <th style="text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED_TEXT};border-bottom:2px solid ${ACCENT};padding-bottom:8px;">Amount</th>
                  </tr>
                  ${order.items.map(itemRowHtml).join("")}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:${MUTED_TEXT};">Subtotal</td>
                    <td style="padding:4px 0;font-size:13px;color:${TEXT};text-align:right;">${formatCurrency(order.subtotal)}</td>
                  </tr>
                  ${
                    order.discountAmount > 0
                      ? `<tr>
                          <td style="padding:4px 0;font-size:13px;color:${MUTED_TEXT};">Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}</td>
                          <td style="padding:4px 0;font-size:13px;color:${ACCENT};text-align:right;">&minus;${formatCurrency(order.discountAmount)}</td>
                        </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:${MUTED_TEXT};">Shipping</td>
                    <td style="padding:4px 0;font-size:13px;color:${TEXT};text-align:right;">
                      ${order.shippingCost > 0 ? formatCurrency(order.shippingCost) : "Free"}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 0 0;font-size:16px;font-weight:bold;color:${TEXT};border-top:1px solid ${BORDER};">Total</td>
                    <td style="padding:12px 0 0 0;font-size:16px;font-weight:bold;color:${TEXT};text-align:right;border-top:1px solid ${BORDER};">${formatCurrency(order.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};border-radius:12px;border:1px solid ${BORDER};">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED_TEXT};">Shipping to</p>
                      <p style="margin:0;font-size:13px;color:${TEXT};line-height:1.6;">
                        ${escapeHtml(address.fullName)}<br />
                        ${escapeHtml(address.line1)}${address.line2 ? `, ${escapeHtml(address.line2)}` : ""}<br />
                        ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postalCode)}<br />
                        ${escapeHtml(address.phone)}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:${PAGE_BG};text-align:center;font-family:Arial,sans-serif;border-top:1px solid ${BORDER};">
                <p style="margin:0;font-size:12px;color:${MUTED_TEXT};">
                  Questions about your order? Reply to this email and we'll help out.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${BRAND_NAME} - Order confirmed

Thank you, ${customerName}!
Order #${orderNumber} - Placed ${dateFormatter.format(new Date(order.createdAt))}

Items:
${order.items.map(itemRowText).join("\n")}

Subtotal: ${formatCurrency(order.subtotal)}
${order.discountAmount > 0 ? `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: -${formatCurrency(order.discountAmount)}\n` : ""}Shipping: ${order.shippingCost > 0 ? formatCurrency(order.shippingCost) : "Free"}
Total: ${formatCurrency(order.total)}

Shipping to:
${address.fullName}
${address.line1}${address.line2 ? `, ${address.line2}` : ""}
${address.city}, ${address.state} ${address.postalCode}
${address.phone}

Questions about your order? Reply to this email and we'll help out.`;

  return { subject, html, text };
}

/** Best-effort - the order itself is already placed and paid for by the
 *  time this is called, so a failed/unconfigured email must never surface
 *  as a failed order. Callers should catch and log, never let this reject
 *  the request that placed the order. */
export async function sendOrderConfirmationEmail(order: OrderView, customerEmail: string, customerName: string): Promise<void> {
  const { subject, html, text } = buildOrderConfirmationEmail(order, customerName);
  await sendMail({ to: customerEmail, subject, html, text });
}
