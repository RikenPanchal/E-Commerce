import type { SVGProps } from "react";

function StarIcon({ filled, ...props }: { filled: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      <path
        d="M10 1.5l2.6 5.4 5.9.9-4.3 4.2 1 5.9L10 15l-5.2 2.9 1-5.9-4.3-4.2 5.9-.9L10 1.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarRating({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const rounded = Math.round(rating);
  const starSize = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-amber-500">
        {[1, 2, 3, 4, 5].map((value) => (
          <StarIcon key={value} filled={value <= rounded} className={starSize} />
        ))}
      </div>
      {count !== undefined ? (
        <span className="text-xs text-foreground/50">
          {count > 0 ? `${rating.toFixed(1)} (${count})` : "No reviews yet"}
        </span>
      ) : null}
    </div>
  );
}
