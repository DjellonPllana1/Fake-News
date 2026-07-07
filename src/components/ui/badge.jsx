/* eslint-disable react-refresh/only-export-components */
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        neutral: "border-[var(--border-strong)] bg-[var(--panel-soft)] text-[var(--muted-foreground)]",
        info: "border-[rgba(42,178,255,0.25)] bg-[rgba(42,178,255,0.12)] text-[var(--accent-strong)]",
        real: "border-[rgba(52,211,153,0.28)] bg-[rgba(52,211,153,0.12)] text-[var(--success)]",
        fake: "border-[rgba(255,92,118,0.28)] bg-[rgba(255,92,118,0.12)] text-[var(--danger)]",
        uncertain: "border-[rgba(255,194,102,0.28)] bg-[rgba(255,194,102,0.12)] text-[var(--warning)]",
        trusted: "border-[rgba(52,211,153,0.28)] bg-[rgba(52,211,153,0.12)] text-[var(--success)]",
        medium: "border-[rgba(42,178,255,0.25)] bg-[rgba(42,178,255,0.12)] text-[var(--accent-strong)]",
        suspicious: "border-[rgba(255,92,118,0.28)] bg-[rgba(255,92,118,0.12)] text-[var(--danger)]",
        unknown: "border-[var(--border-strong)] bg-[var(--panel-soft)] text-[var(--muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
