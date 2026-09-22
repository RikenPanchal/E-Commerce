import type { z } from "zod";

/** Collapses a ZodError down to the first message per top-level field. */
export function firstFieldErrors<T extends Record<string, unknown>>(
  error: z.ZodError<T>
): Partial<Record<keyof T, string>> {
  const fieldErrors: Partial<Record<keyof T, string>> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof T] = issue.message;
    }
  }

  return fieldErrors;
}

/**
 * Same idea as `firstFieldErrors`, but keyed by the *leaf* segment of each
 * issue's path instead of the top-level one - for a schema that nests a
 * sub-object (`placeOrderSchema`'s `shippingAddress: {...}`, say), a bad
 * `shippingAddress.city` otherwise collapses to the single key
 * `"shippingAddress"`, which no individual form field is ever bound to, so
 * the message never reaches the input it's actually about. Only worth using
 * where the caller's form fields are keyed by those leaf names directly
 * (as the checkout address form's are) - `firstFieldErrors` stays the
 * right choice for every flat (non-nested) schema in the app.
 */
export function nestedFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const leaf = issue.path[issue.path.length - 1];
    const key = typeof leaf === "string" ? leaf : issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}
