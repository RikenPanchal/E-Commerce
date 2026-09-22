import { StarRating } from "@/components/shop/StarRating";
import type { ReviewView } from "@/types/review";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No reviews yet - be the first to share your thoughts.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="border-b border-black/5 pb-5 last:border-0 dark:border-white/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {review.userName}
            </span>
            <span className="text-xs text-foreground/50">
              {dateFormatter.format(new Date(review.createdAt))}
            </span>
          </div>
          <div className="mt-1">
            <StarRating rating={review.rating} />
          </div>
          {review.comment ? (
            <p className="mt-2 text-sm text-foreground/70">{review.comment}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
