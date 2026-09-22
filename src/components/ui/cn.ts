/** Joins conditional class names, skipping falsy values - a tiny stand-in
 *  for `clsx` so the design system doesn't need a new dependency for
 *  something this small. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
