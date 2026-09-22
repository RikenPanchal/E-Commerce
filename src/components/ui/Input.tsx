import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

/** Shared look for every text-entry control - a plain hairline border
 *  (no heavy default shadow), minimal rounding, and a quiet accent-colored
 *  focus ring instead of a thick blue browser outline. Disabled fields use
 *  the soft neutral, not the page background - on a page whose own
 *  background already is `bg-background`, that would make a disabled
 *  field look identical to an empty area of the page instead of visibly
 *  "off". */
const FIELD_CLASSES =
  "w-full rounded-md border border-surface-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted-foreground";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_CLASSES, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_CLASSES, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD_CLASSES, "cursor-pointer appearance-none bg-no-repeat pr-9", className)} {...props} />;
}

/** Small, tracked-out uppercase label - the editorial equivalent of a
 *  plain form label, used above an Input/Select/Textarea. */
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-medium tracking-wide text-foreground/80 uppercase",
        className
      )}
      {...props}
    />
  );
}
