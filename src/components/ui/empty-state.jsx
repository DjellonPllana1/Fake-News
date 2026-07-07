import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

export function EmptyState({ icon = Sparkles, title, description, className, children }) {
  const Icon = icon;

  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--panel-soft)] px-6 py-10 text-center",
        className
      )}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] text-[var(--accent-strong)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">{description}</p>
      {children ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </div>
  );
}
