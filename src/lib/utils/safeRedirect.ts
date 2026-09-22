/** Only follow `from` if it's a same-app path - never an absolute/protocol-relative URL. */
export function getSafeRedirect(from: string | null): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//")) {
    return null;
  }
  return from;
}
