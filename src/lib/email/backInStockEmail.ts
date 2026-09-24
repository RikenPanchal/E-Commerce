import { sendMail } from "@/lib/email/mailer";
import { ACCENT, ACCENT_DARK, BORDER, BRAND_NAME, CARD_BG, MUTED_TEXT, PAGE_BG, TEXT, escapeHtml } from "@/lib/email/theme";
import { formatCurrency } from "@/lib/utils/currency";

export interface BackInStockEmailInput {
  to: string;
  productName: string;
  /** e.g. "M / Black & Red" - only for a variant subscription. */
  variantLabel?: string;
  price: number;
  /** Absolute URLs - relative paths don't work inside an email. */
  productUrl: string;
  imageUrl?: string;
}

/** Builds the "it's back in stock" email - subject/html/text. A restock
 *  alert is one-time (the subscription is marked "notified" once this is
 *  sent), so there's no unsubscribe link - there's nothing left to cancel. */
export function buildBackInStockEmail(input: BackInStockEmailInput) {
  const { productName, variantLabel, price, productUrl, imageUrl } = input;
  const subject = `Back in stock: ${productName}${variantLabel ? ` (${variantLabel})` : ""}`;
  const safeProductUrl = escapeHtml(productUrl);

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
              <td style="padding:32px;">
                <p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${ACCENT};font-family:Arial,sans-serif;">Good news &middot; Back in stock</p>
                <h1 style="margin:6px 0 0 0;font-size:24px;color:${TEXT};">It's back - get it before it's gone</h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:22px;color:${MUTED_TEXT};font-family:Arial,sans-serif;">
                  You asked us to let you know when this was available again. Stock is limited, so it may sell out quickly.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid ${BORDER};border-radius:12px;background-color:${PAGE_BG};">
                  <tr>
                    ${
                      imageUrl
                        ? `<td width="120" style="padding:14px;vertical-align:top;">
                      <a href="${safeProductUrl}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(productName)}" width="104" style="display:block;width:104px;max-width:104px;height:auto;border-radius:8px;border:0;" /></a>
                    </td>`
                        : ""
                    }
                    <td style="padding:14px ${imageUrl ? "14px 14px 0" : "18px"};vertical-align:middle;font-family:Arial,sans-serif;">
                      <a href="${safeProductUrl}" style="font-size:16px;font-weight:bold;color:${TEXT};text-decoration:none;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(productName)}</a>
                      ${variantLabel ? `<div style="margin-top:4px;font-size:13px;color:${MUTED_TEXT};">${escapeHtml(variantLabel)}</div>` : ""}
                      <div style="margin-top:8px;font-size:15px;font-weight:bold;color:${ACCENT};">${formatCurrency(price)}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:${ACCENT};">
                      <a href="${safeProductUrl}" style="display:inline-block;padding:13px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${PAGE_BG};text-decoration:none;">Shop now</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:${PAGE_BG};text-align:center;font-family:Arial,sans-serif;border-top:1px solid ${BORDER};">
                <p style="margin:0;font-size:12px;line-height:18px;color:${MUTED_TEXT};">
                  You're receiving this because you asked for a restock alert on ${BRAND_NAME}. It was a one-time alert, so you won't get any more emails about this item.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${BRAND_NAME} - Back in stock

It's back - get it before it's gone.
You asked us to let you know when this was available again. Stock is limited, so it may sell out quickly.

${productName}${variantLabel ? `\n${variantLabel}` : ""}
${formatCurrency(price)}

Shop now: ${productUrl}

You're receiving this because you asked for a restock alert on ${BRAND_NAME}. It was a one-time alert, so you won't get any more emails about this item.`;

  return { subject, html, text };
}

export async function sendBackInStockEmail(input: BackInStockEmailInput): Promise<void> {
  const { subject, html, text } = buildBackInStockEmail(input);
  await sendMail({ to: input.to, subject, html, text });
}
