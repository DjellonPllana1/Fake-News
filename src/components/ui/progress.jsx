import { cn } from "../../lib/utils";

export function ProgressBar({ label, value = 0, helper, tone = "accent", className }) {
  const percentage = Math.max(0, Math.min(100, Math.round(Number(value || 0))));
  const toneClass =
    tone === "danger"
      ? "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--danger),#ff9f7c)] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--danger),#ff9f7c)]"
      : tone === "warning"
        ? "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--warning),#ffd173)] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--warning),#ffd173)]"
        : tone === "success"
          ? "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--success),#8df6c7)] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--success),#8df6c7)]"
          : "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]";

  return (
    <div className={cn("space-y-2", className)}>
      {(label || helper) && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--muted-foreground)]">{label}</span>
          <span className="font-medium text-[var(--foreground)]">{helper || `${percentage}%`}</span>
        </div>
      )}
      <progress
        className={cn(
          "progress-track h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--panel-soft)]",
          toneClass
        )}
        max="100"
        value={percentage}
      />
    </div>
  );
}
