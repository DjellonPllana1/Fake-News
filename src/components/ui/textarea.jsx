import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-[220px] w-full rounded-[26px] border border-[var(--border-strong)] bg-[var(--input)] px-4 py-3.5 text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition-all duration-200 placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-emphasis)] focus:ring-2 focus:ring-[var(--ring)]/35",
        className
      )}
      {...props}
    />
  );
}
