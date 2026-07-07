import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export function SectionHeader({ eyebrow, title, description, actions = null, badge = null, className = "" }) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)] md:text-[2rem]">{title}</h2>
          {description ? <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
