import nodemailer, { type Transporter } from "nodemailer";

// Gmail (with an app password) is the default, matching `EMAIL_USER`/
// `EMAIL_PASS` in `.env.local` - set `SMTP_HOST`/`SMTP_PORT` instead to point
// at any other provider without changing this file. Built lazily and cached
// (not at module load) so importing this file never throws when the
// credentials aren't configured yet - only actually sending an email does.
let cachedTransporter: Transporter | null = null;

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("EMAIL_USER and EMAIL_PASS are not set - see .env.example.");
    this.name = "EmailNotConfiguredError";
  }
}

/** True when `EMAIL_USER`/`EMAIL_PASS` are set - lets a caller decide up
 *  front (without attempting a send) whether email can go out at all. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter(): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new EmailNotConfiguredError();
  }

  const host = process.env.SMTP_HOST;
  cachedTransporter = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user, pass },
      })
    : nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });

  return cachedTransporter;
}

export interface MailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}

/** Sends one email through the configured transporter. Throws
 *  `EmailNotConfiguredError` if `EMAIL_USER`/`EMAIL_PASS` aren't set, and
 *  whatever `nodemailer` itself throws on a real send failure - callers that
 *  send best-effort notification emails (order confirmations, etc.) should
 *  catch and log rather than let this fail the request that triggered it. */
export async function sendMail(message: MailMessage): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: message.attachments,
  });
}
