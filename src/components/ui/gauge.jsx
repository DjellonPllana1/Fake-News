import { cn } from "../../lib/utils";

const toneMap = {
  accent: {
    stroke: "var(--accent-strong)",
    glow: "rgba(42, 178, 255, 0.22)",
  },
  success: {
    stroke: "var(--success)",
    glow: "rgba(52, 211, 153, 0.22)",
  },
  warning: {
    stroke: "var(--warning)",
    glow: "rgba(255, 194, 102, 0.22)",
  },
  danger: {
    stroke: "var(--danger)",
    glow: "rgba(255, 92, 118, 0.22)",
  },
};

export function Gauge({ value = 0, label, helper, tone = "accent", className }) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(value || 0))));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const colors = toneMap[tone] || toneMap.accent;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5", className)}>
      <svg viewBox="0 0 140 140" className="h-36 w-36">
        <defs>
          <filter id={`gauge-glow-${tone}`}>
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor={colors.glow} />
          </filter>
        </defs>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--panel-border-soft)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 70 70)"
          filter={`url(#gauge-glow-${tone})`}
        />
        <text x="70" y="66" textAnchor="middle" className="fill-[var(--foreground)] text-[30px] font-semibold">
          {normalized}
        </text>
        <text x="70" y="88" textAnchor="middle" className="fill-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.2em]">
          {helper || "percent"}
        </text>
      </svg>
      {label ? <span className="text-sm font-medium text-[var(--foreground)]">{label}</span> : null}
    </div>
  );
}
