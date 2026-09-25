// ============================================================
// StatCard.jsx - Karta e Statistikës
// ============================================================
// Shfaq një statistikë të vetme me animacion numrash.
// Kur vlera ndryshon, numri "numërohet" nga 0 deri në vlerën
// e re me një efekt të butë vizual.
// Shembull: "Artikuj të analizuar: 1,234"
// ============================================================

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

// parseDisplayValue - Ndaj vlerën në pjesë (prefix, numër, suffix)
// Shembull: "94.5%" → { prefix: "", numeric: 94.5, suffix: "%", decimals: 1 }
// Shembull: "$1200" → { prefix: "$", numeric: 1200, suffix: "", decimals: 0 }
function parseDisplayValue(value) {
  // Nëse vlera është tashmë numër, ktheje direkt
  if (typeof value === "number") {
    return {
      numeric: value,
      prefix: "",
      suffix: "",
      // Nëse është numër i plotë (p.sh. 5), s'kemi presje dhjetore
      decimals: Number.isInteger(value) ? 0 : 1,
    };
  }

  // Ktheje në string nëse nuk është
  const text = String(value ?? "");
  // Regex: kap simbolet para numrit, vetë numrin, dhe simbolet pas numrit
  const match = text.match(/^([^0-9-]*)(-?\d+(?:\.\d+)?)(.*)$/);

  // Nëse nuk ka numër brenda vlerës, s'mund ta animojmë
  if (!match) {
    return null;
  }

  return {
    prefix: match[1] || "",      // P.sh. "$" ose ""
    numeric: Number(match[2]),   // Numri vetë (p.sh. 1200)
    suffix: match[3] || "",      // P.sh. "%" ose ""
    decimals: String(match[2]).includes(".") ? 1 : 0,  // A ka presje dhjetore?
  };
}

// formatNumber - Formato numrin me ndarës mijëshi
// Shembull: 1234567 → "1,234,567"
function formatNumber(value, decimals) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// toneClassMap - Harta e ngjyrave sipas llojit të rezultatit
// Çdo "ton" ka ngjyrën e vet CSS
const toneClassMap = {
  neutral:   "text-[var(--foreground)]",    // Gri - neutral
  real:      "text-[var(--success)]",        // Gjelbër - lajm real
  fake:      "text-[var(--danger)]",         // Kuq - lajm i rremë
  uncertain: "text-[var(--warning)]",        // Portokalli - i pasigurt
  medium:    "text-[var(--accent-strong)]",  // Blu - i mesëm
};

// Krijoni një version të animuar të <article> duke përdorur framer-motion
const MotionArticle = motion.article;

// StatCard - Komponenti kryesor i kartës statistike
// Parametrat:
//   title  - Titulli i statistikës (p.sh. "Artikuj të Analizuar")
//   value  - Vlera e statistikës (p.sh. 1234 ose "94.5%")
//   hint   - Teksti shpjegues i vogël nën titull
//   tone   - Ngjyra: "neutral" | "real" | "fake" | "uncertain" | "medium"
//   icon   - Ikona (komponent nga Lucide React) opsionale
export function StatCard({ title, value, hint, tone = "neutral", icon: Icon = null }) {
  // Analizojmë vlerën për të ndarë prefix, numër dhe suffix
  const parsed = parseDisplayValue(value);

  // displayValue - vlera që shfaqet aktualisht (animohet nga 0 → vlerën finale)
  const [displayValue, setDisplayValue] = useState(() => {
    // Nëse s'mund të analizojmë, shfaq vlerën direkt pa animacion
    if (!parsed) {
      return value;
    }
    // Fillo nga 0 (p.sh. "$0" ose "0%")
    return `${parsed.prefix}${formatNumber(0, parsed.decimals)}${parsed.suffix}`;
  });

  // useEffect - Ekzekuto animacionin çdo herë që "value" ndryshon
  useEffect(() => {
    const nextParsed = parseDisplayValue(value);

    // Nëse vlera nuk ka numër, mos animo
    if (!nextParsed) {
      return undefined;
    }

    let animationFrame = 0;
    const durationMs = 900;             // Animacioni zgjat 900ms (0.9 sekonda)
    const startTime = performance.now(); // Koha e fillimit të animacionit

    // Funksioni i animacionit - thirret çdo frame (rreth 60 herë/sekondë)
    const animate = (now) => {
      // Llogarit progresin (0 = fillimi, 1 = fundi)
      const progress = Math.min((now - startTime) / durationMs, 1);
      // "Easing" - bëj animacionin të ngadalësohet në fund (efekt natyral)
      const eased = 1 - (1 - progress) ** 3;
      // Vlera aktuale = vlera finale × progresi
      const currentValue = nextParsed.numeric * eased;
      setDisplayValue(`${nextParsed.prefix}${formatNumber(currentValue, nextParsed.decimals)}${nextParsed.suffix}`);

      // Vazhdo animacionin nëse s'ka mbaruar ende
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    // Fillo animacionin
    animationFrame = window.requestAnimationFrame(animate);

    // Kthim - kur komponenti zhduket ose vlera ndryshon, ndalo animacionin
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    // MotionArticle - Kartë me efekt lëvizjeje kur mbivendosni miun (hover: lëviz lart 4px)
    <MotionArticle
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="surface-card flex min-h-[168px] flex-col gap-5 p-5"
    >
      {/* Rreshti i sipërm: titulli dhe ikona */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          {/* Titulli i kartës (p.sh. "Artikuj të Analizuar") */}
          <span className="eyebrow">{title}</span>
          {/* Teksti shpjegues i vogël */}
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">{hint}</p>
        </div>
        {/* Ikona - shfaqet vetëm nëse është dhënë */}
        {Icon ? (
          <span className={cn("metric-icon shrink-0", toneClassMap[tone] || toneClassMap.neutral)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      {/* Vlera kryesore - e madhe dhe me ngjyrën e tonit */}
      <strong className={cn("font-display text-[clamp(2rem,3vw,2.75rem)] font-semibold tracking-[-0.06em]", toneClassMap[tone] || toneClassMap.neutral)}>
        {/* Nëse vlera mund të animohet, shfaq displayValue (animohet), përndryshe shfaq vlerën direkt */}
        {parsed ? displayValue : value}
      </strong>
    </MotionArticle>
  );
}
