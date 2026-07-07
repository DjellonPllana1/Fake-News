import { useEffect, useState } from "react";

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
    const durationMs = 800;
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
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__header">
        <span className="eyebrow">{title}</span>
        {Icon ? (
          <span className="stat-card__icon">
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <strong>{parsed ? displayValue : value}</strong>
      <p>{hint}</p>
    </article>
  );
}
