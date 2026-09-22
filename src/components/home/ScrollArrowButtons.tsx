import { ChevronLeftIcon, ChevronRightIcon } from "@/components/home/icons";

/** The pair of round prev/next buttons every homepage carousel uses -
 *  `theme="dark"` for a burgundy section (light ring on a dark panel),
 *  `theme="light"` (default) for every ivory/blush/cream section. */
export function ScrollArrowButtons({
  edges,
  onPrev,
  onNext,
  theme = "light",
}: {
  edges: { atStart: boolean; atEnd: boolean };
  onPrev: () => void;
  onNext: () => void;
  theme?: "light" | "dark";
}) {
  const base = "flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-30";
  const themed =
    theme === "dark"
      ? "border-white/25 bg-white/10 text-white hover:border-white/50 hover:bg-white/20"
      : "border-surface-border bg-surface text-foreground hover:border-foreground/40 hover:bg-rose-50";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrev} disabled={edges.atStart} aria-label="Previous" className={`${base} ${themed}`}>
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <button type="button" onClick={onNext} disabled={edges.atEnd} aria-label="Next" className={`${base} ${themed}`}>
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
