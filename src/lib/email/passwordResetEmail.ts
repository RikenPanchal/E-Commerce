import { sendMail } from "@/lib/email/mailer";
import { ACCENT, ACCENT_DARK, BORDER, BRAND_NAME, CARD_BG, MUTED_TEXT, PAGE_BG, TEXT, escapeHtml } from "@/lib/email/theme";

/** Builds the "reset your password" email - subject/html/text. The link is
 *  the only way to use the one-time token, so it's shown both as a button
 *  and as plain text (for mail clients that block buttons/links). */
export function buildPasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes,
}: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const subject = `Reset your ${BRAND_NAME} password`;
  const safeUrl = escapeHtml(resetUrl);
  const firstName = name.split(" ")[0] || name;

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
                <p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${ACCENT};font-family:Arial,sans-serif;">Password reset</p>
                <h1 style="margin:6px 0 0 0;font-size:24px;color:${TEXT};">Hi ${escapeHtml(firstName)},</h1>
                <p style="margin:14px 0 0 0;font-size:14px;line-height:22px;color:${MUTED_TEXT};font-family:Arial,sans-serif;">
                  We received a request to reset the password for your ${BRAND_NAME} account. Click the button below to choose a new one.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="border-radius:8px;background-color:${ACCENT};">
                      <a href="${safeUrl}" style="display:inline-block;padding:13px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${PAGE_BG};text-decoration:none;">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;line-height:20px;color:${MUTED_TEXT};font-family:Arial,sans-serif;">
                  This link expires in ${expiresInMinutes} minutes and can only be used once. If the button doesn't work, copy this link into your browser:
                </p>
                <p style="margin:8px 0 0 0;font-size:12px;line-height:18px;word-break:break-all;font-family:Arial,sans-serif;">
                  <a href="${safeUrl}" style="color:${ACCENT};">${safeUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:${PAGE_BG};text-align:center;font-family:Arial,sans-serif;border-top:1px solid ${BORDER};">
                <p style="margin:0;font-size:12px;line-height:18px;color:${MUTED_TEXT};">
                  Didn't ask to reset your password? You can safely ignore this email - your password won't change.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${BRAND_NAME} - Password reset

Hi ${firstName},

We received a request to reset the password for your ${BRAND_NAME} account. Open this link to choose a new one:

${resetUrl}

This link expires in ${expiresInMinutes} minutes and can only be used once.

Didn't ask to reset your password? You can safely ignore this email - your password won't change.`;

  return { subject, html, text };
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  const { subject, html, text } = buildPasswordResetEmail(input);
  await sendMail({ to: input.to, subject, html, text });
}
