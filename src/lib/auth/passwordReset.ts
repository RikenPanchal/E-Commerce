import { randomBytes, createHash } from "node:crypto";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface GeneratedResetToken {
  /** The raw token - goes in the reset link, never stored. */
  rawToken: string;
  /** SHA-256 of the raw token - what actually gets stored and compared. */
  tokenHash: string;
  expiresAt: Date;
}

export function generateResetToken(): GeneratedResetToken {
  const rawToken = randomBytes(32).toString("hex");
  return {
    rawToken,
    tokenHash: hashResetToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
