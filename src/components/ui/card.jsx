import { cn } from "../../lib/utils";

export function Card({ className, children, ...props }) {
  return (
    <section className={cn("surface-card", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-5 md:flex-row md:items-start md:justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h2 className={cn("font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)] md:text-2xl", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {children}
    </div>
  );
}
