import { z } from "zod";
import { isValidObjectId } from "mongoose";

export const backInStockSubscribeSchema = z.object({
  productId: z.string().refine(isValidObjectId, "Invalid product"),
  variantId: z
    .string()
    .refine(isValidObjectId, "Invalid variant")
    .optional(),
  // Only actually required for a guest - an authenticated request ignores
  // this and uses the signed-in account's own email (see
  // `subscribeToBackInStock`), but the field stays optional at the schema
  // level since a signed-in request legitimately omits it.
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").optional(),
});

export type BackInStockSubscribeInput = z.infer<typeof backInStockSubscribeSchema>;
