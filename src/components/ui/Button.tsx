import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "link" | "burgundy" | "outline-burgundy";
export type ButtonSize = "sm" | "md" | "lg";

/** Deliberately not a big rounded pill - small square-ish corners (4px, via
 *  the shared radius scale), generous horizontal padding, and no drop
 *  shadow reads as editorial rather than "generic SaaS button". `primary`
 *  is ink-on-white/white-on-ink, matching how premium fashion sites treat
 *  their main CTA - the rose accent is reserved for `accent`, used
 *  sparingly for a single highlighted action per view, never as the
 *  default button color everywhere. Tracked-out uppercase labels on the
 *  three "real button" variants read as a confident, considered fashion-
 *  brand CTA rather than an ordinary sentence-case UI button; `ghost` and
 *  `link` stay plain since they're quieter, secondary actions. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 disabled:bg-foreground/40 uppercase tracking-[0.08em]",
  accent: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/40 uppercase tracking-[0.08em]",
  outline:
    "border border-surface-border bg-surface text-foreground hover:border-foreground/30 hover:bg-background disabled:opacity-40 uppercase tracking-[0.08em]",
  ghost: "text-foreground hover:bg-foreground/5 disabled:opacity-40",
  link: "text-rose-600 underline-offset-4 hover:underline disabled:opacity-40 p-0 h-auto",
  // Deep-burgundy CTA - additive, used only where a page's own visual
  // direction specifically calls for burgundy as the primary action color
  // (the Shop page's "Modern Feminine" redesign) rather than this app's
  // default ink-on-white `primary`. Every other existing call site of
  // `primary`/`accent`/etc. is unaffected by adding these two variants.
  burgundy: "bg-rose-800 text-white hover:bg-burgundy disabled:bg-rose-800/40 uppercase tracking-[0.08em]",
  "outline-burgundy":
    "border border-rose-800 bg-transparent text-rose-800 hover:bg-blush disabled:opacity-40 uppercase tracking-[0.08em]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-sm",
};

/** Shared base + variant/size classes, exported separately so a
 *  non-`<button>` element (a Next `<Link>` styled as a CTA, for instance)
 *  can render with the exact same look without wrapping this component. */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    // Tracking is set per-variant below (uppercase CTAs get a wider,
    // deliberate letter-spacing; `ghost`/`link` stay at the browser
    // default) rather than here, so the two never fight over the same
    // property.
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    variant !== "link" ? SIZE_CLASSES[size] : undefined,
    className
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
