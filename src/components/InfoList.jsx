import { cn } from "../lib/utils";

export function InfoList({ items = [], className = "" }) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel-soft)] px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4"
        >
          <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
          <strong className="text-sm font-semibold text-[var(--foreground)]">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
