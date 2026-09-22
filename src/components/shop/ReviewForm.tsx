"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ReviewResponse, ReviewView } from "@/types/review";

export function ReviewForm({
  slug,
  existingReview,
}: {
  slug: string;
  existingReview: ReviewView | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const displayRating = hoverRating || rating;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      setError("Please select a star rating");
      return;
    }
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const data = (await response.json()) as ReviewResponse;

      if (!data.success) {
        setError(data.message);
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-black/5 p-5 shadow-sm dark:border-white/10 dark:shadow-none"
    >
      <h3 className="text-sm font-semibold text-foreground">
        {existingReview ? "Update your review" : "Write a review"}
      </h3>

      <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            className="text-2xl leading-none"
          >
            <span className={value <= displayRating ? "text-amber-500" : "text-black/15 dark:text-white/15"}>
              &#9733;
            </span>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        placeholder="Share your thoughts about this product (optional)"
        className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
      />

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {success ? <p className="text-sm text-green-600 dark:text-green-400">Thanks for your review!</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : existingReview ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
