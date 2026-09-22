/** Escapes regex metacharacters so user input can be safely used inside a `RegExp`. */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
