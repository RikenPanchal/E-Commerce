"use client";

import { useState } from "react";
import { StarRating } from "@/components/shop/StarRating";
import type { ReviewView } from "@/types/review";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

/** Comments longer than this start clamped to 3 lines with a "Read more"
 *  toggle, so one long review can't stretch the whole section. */
const LONG_COMMENT_CHARS = 180;

function ReviewItem({ review }: { review: ReviewView }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (review.comment?.length ?? 0) > LONG_COMMENT_CHARS;

  return (
    <li className="border-b border-surface-border py-3.5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="truncate text-sm font-medium text-foreground">{review.userName}</span>
          <StarRating rating={review.rating} />
        </div>
        <time dateTime={review.createdAt} className="shrink-0 pt-0.5 text-xs text-muted-foreground">
          {dateFormatter.format(new Date(review.createdAt))}
        </time>
      </div>
      {review.comment ? (
        <>
          <p className={`mt-1.5 text-sm leading-relaxed text-foreground/75 ${isLong && !expanded ? "line-clamp-3" : ""}`}>
            {review.comment}
          </p>
          {isLong ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 text-xs font-medium text-rose-400 transition-colors hover:text-rose-300"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

export function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet - be the first to share your thoughts.</p>;
  }

  return (
    <ul className="flex flex-col">
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}
    </ul>
  );
}
