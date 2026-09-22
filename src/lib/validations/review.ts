import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce
    .number("Please select a star rating")
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(1000, "Comment is too long").optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
