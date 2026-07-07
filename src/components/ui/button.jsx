/* eslint-disable react-refresh/only-export-components */
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-slate-950 shadow-[0_18px_40px_rgba(42,178,255,0.22)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(42,178,255,0.28)]",
        secondary:
          "border-[var(--border-strong)] bg-[var(--panel-soft)] px-5 py-3 text-[var(--foreground)] hover:-translate-y-0.5 hover:border-[var(--border-emphasis)] hover:bg-[var(--panel-hover)]",
        ghost:
          "border-transparent bg-transparent px-4 py-3 text-[var(--muted-foreground)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]",
        outline:
          "border-[var(--border-strong)] bg-[var(--panel)] px-5 py-3 text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-[var(--border-emphasis)] hover:bg-[var(--panel-hover)]",
        destructive:
          "border-transparent bg-[linear-gradient(135deg,var(--danger),#ff9f7c)] px-5 py-3 text-white shadow-[0_18px_40px_rgba(255,92,118,0.22)] hover:-translate-y-0.5",
      },
      size: {
        default: "h-11",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 px-6 text-sm",
        icon: "h-11 w-11 rounded-2xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  const resolvedProps = !asChild && !props.type ? { ...props, type: "button" } : props;

  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...resolvedProps} />;
}
