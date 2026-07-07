import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

function parseDisplayValue(value) {
  if (typeof value === "number") {
    return {
      numeric: value,
      prefix: "",
      suffix: "",
      decimals: Number.isInteger(value) ? 0 : 1,
    };
  }

  const text = String(value ?? "");
  const match = text.match(/^([^0-9-]*)(-?\d+(?:\.\d+)?)(.*)$/);

  if (!match) {
    return null;
  }

  return {
    prefix: match[1] || "",
    numeric: Number(match[2]),
    suffix: match[3] || "",
    decimals: String(match[2]).includes(".") ? 1 : 0,
  };
}

function formatNumber(value, decimals) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const toneClassMap = {
  neutral: "text-[var(--foreground)]",
  real: "text-[var(--success)]",
  fake: "text-[var(--danger)]",
  uncertain: "text-[var(--warning)]",
  medium: "text-[var(--accent-strong)]",
};

const MotionArticle = motion.article;

export function StatCard({ title, value, hint, tone = "neutral", icon: Icon = null }) {
  const parsed = parseDisplayValue(value);
  const [displayValue, setDisplayValue] = useState(() => {
    if (!parsed) {
      return value;
    }

    return `${parsed.prefix}${formatNumber(0, parsed.decimals)}${parsed.suffix}`;
  });

  useEffect(() => {
    const nextParsed = parseDisplayValue(value);

    if (!nextParsed) {
      return undefined;
    }

    let animationFrame = 0;
    const durationMs = 900;
    const startTime = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      const currentValue = nextParsed.numeric * eased;
      setDisplayValue(`${nextParsed.prefix}${formatNumber(currentValue, nextParsed.decimals)}${nextParsed.suffix}`);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    <MotionArticle
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="surface-card flex min-h-[168px] flex-col gap-5 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="eyebrow">{title}</span>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">{hint}</p>
        </div>
        {Icon ? (
          <span className={cn("metric-icon shrink-0", toneClassMap[tone] || toneClassMap.neutral)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <strong className={cn("font-display text-[clamp(2rem,3vw,2.75rem)] font-semibold tracking-[-0.06em]", toneClassMap[tone] || toneClassMap.neutral)}>
        {parsed ? displayValue : value}
      </strong>
    </MotionArticle>
  );
}
