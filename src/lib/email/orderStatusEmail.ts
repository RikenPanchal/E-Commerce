import { formatCurrency } from "@/lib/utils/currency";
import { sendMail } from "@/lib/email/mailer";
import { itemRowHtml, itemRowText } from "@/lib/email/orderConfirmationEmail";
import { ACCENT, ACCENT_DARK, BORDER, BRAND_NAME, CARD_BG, MUTED_TEXT, PAGE_BG, TEXT, escapeHtml } from "@/lib/email/theme";
import { absoluteUrl } from "@/lib/seo/site";
import type { OrderView } from "@/types/order";

/** The fulfillment updates a customer is emailed about - "processing" isn't
 *  one: the order confirmation email already covers "we've got it". */
export type OrderStatusEmailKind = "shipped" | "delivered" | "cancelled";

export function isOrderStatusEmailKind(status: string): status is OrderStatusEmailKind {
  return status === "shipped" || status === "delivered" || status === "cancelled";
}

interface StatusCopy {
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  /** An optional highlighted panel - tracking details, or refund info. */
  panel?: { label: string; lines: string[] };
  /** Plain-text-safe note below the panel. */
  note?: string;
}

/** Wording comes from the site's own policies: delivery estimates from the
 *  Shipping Policy (src/app/(shop)/shipping/page.tsx, section 2) and the
 *  refund promise/timeline from its sections 3-4 and the Terms. */
function copyFor(kind: OrderStatusEmailKind, order: OrderView, orderNumber: string): StatusCopy {
  if (kind === "shipped") {
    const tracking = [
      order.carrier ? `Courier: ${order.carrier}` : null,
      order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : null,
    ].filter((line): line is string => line !== null);
    return {
      subject: `Your ${BRAND_NAME} order #${orderNumber} has shipped`,
      eyebrow: "Shipped",
      heading: "Your order is on its way",
      intro: `Good news - order #${orderNumber} has been packed and handed to our courier partner.`,
      panel: tracking.length > 0 ? { label: "Tracking details", lines: tracking } : undefined,
      note: "Estimated delivery from today: 2-4 business days for metro cities, 4-7 for other cities and towns, and 7-10 for remote pin codes.",
    };
  }
  if (kind === "delivered") {
    return {
      subject: `Your ${BRAND_NAME} order #${orderNumber} has been delivered`,
      eyebrow: "Delivered",
      heading: "Your order has arrived",
      intro: `Order #${orderNumber} has been delivered. We hope you love it!`,
      note: "Enjoying your purchase? You can leave a review from the product page - it helps other shoppers choose.",
    };
  }
  const wasPaid = order.paymentStatus === "paid";
  return {
    subject: `Your ${BRAND_NAME} order #${orderNumber} has been cancelled`,
    eyebrow: "Order cancelled",
    heading: "Your order has been cancelled",
    intro: `We're sorry - order #${orderNumber} has been cancelled and won't be shipped.`,
    panel: wasPaid
      ? {
          label: "Refund",
          lines: [
            `${formatCurrency(order.total)} will be refunded in full to your original payment method.`,
            "Refunds are issued within 7-10 business days; your bank may take a little longer to show it.",
          ],
        }
      : undefined,
    note: wasPaid ? undefined : "No payment was taken for this order, so there's nothing to refund.",
  };
}

/** Builds a shipped / delivered / cancelled update email - subject/html/text
 *  - from the order exactly as saved (every figure read off the order). */
export function buildOrderStatusEmail(kind: OrderStatusEmailKind, order: OrderView, customerName: string) {
  const orderNumber = order.id.slice(-8).toUpperCase();
  const copy = copyFor(kind, order, orderNumber);
  const orderUrl = absoluteUrl(`/orders/${order.id}`);
  const firstName = customerName.split(" ")[0] || customerName;

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
                <p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${ACCENT};font-family:Arial,sans-serif;">${escapeHtml(copy.eyebrow)} &middot; Order #${orderNumber}</p>
                <h1 style="margin:6px 0 0 0;font-size:24px;color:${TEXT};">${escapeHtml(copy.heading)}</h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:22px;color:${MUTED_TEXT};font-family:Arial,sans-serif;">
                  Hi ${escapeHtml(firstName)}, ${escapeHtml(copy.intro.charAt(0).toLowerCase() + copy.intro.slice(1))}
                </p>
              </td>
            </tr>
            ${
              copy.panel
                ? `<tr>
              <td style="padding:16px 32px 0 32px;font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};border-radius:12px;border:1px solid ${ACCENT};">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">${escapeHtml(copy.panel.label)}</p>
                      ${copy.panel.lines.map((line) => `<p style="margin:0;font-size:14px;line-height:22px;color:${TEXT};">${escapeHtml(line)}</p>`).join("")}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ""
            }
            ${
              copy.note
                ? `<tr>
              <td style="padding:16px 32px 0 32px;font-size:13px;line-height:20px;color:${MUTED_TEXT};font-family:Arial,sans-serif;">${escapeHtml(copy.note)}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:20px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">
                  ${order.items.map(itemRowHtml).join("")}
                  <tr>
                    <td colspan="2" style="padding:12px 0 0 0;font-size:15px;font-weight:bold;color:${TEXT};">Order total</td>
                    <td style="padding:12px 0 0 0;font-size:15px;font-weight:bold;color:${TEXT};text-align:right;">${formatCurrency(order.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:${ACCENT};">
                      <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:13px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${PAGE_BG};text-decoration:none;">View order</a>
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

  const text = `${BRAND_NAME} - ${copy.eyebrow} - Order #${orderNumber}

${copy.heading}

Hi ${firstName}, ${copy.intro.charAt(0).toLowerCase() + copy.intro.slice(1)}
${copy.panel ? `\n${copy.panel.label}:\n${copy.panel.lines.map((line) => `  ${line}`).join("\n")}\n` : ""}${copy.note ? `\n${copy.note}\n` : ""}
Items:
${order.items.map(itemRowText).join("\n")}

Order total: ${formatCurrency(order.total)}

View your order: ${orderUrl}

Questions about your order? Reply to this email and we'll help out.`;

  return { subject: copy.subject, html, text };
}

export async function sendOrderStatusEmail(
  kind: OrderStatusEmailKind,
  order: OrderView,
  customerEmail: string,
  customerName: string
): Promise<void> {
  const { subject, html, text } = buildOrderStatusEmail(kind, order, customerName);
  await sendMail({ to: customerEmail, subject, html, text });
}
