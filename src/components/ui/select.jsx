import { cn } from "../../lib/utils";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input)] px-4 text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition-all duration-200 focus:border-[var(--border-emphasis)] focus:ring-2 focus:ring-[var(--ring)]/35",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
