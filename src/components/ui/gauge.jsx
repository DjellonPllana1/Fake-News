// ============================================================
// gauge.jsx - Matësi Rrethor (Gauge / Tregues)
// ============================================================
// Shfaq një tregues rrethor si orë numerike.
// Përdoret për të shfaqur nota si Trust Score, Confidence Score etj.
//
// Variantet e ngjyrave (tone):
//   accent  → blu (parazgjedhja)
//   success → jeshile
//   warning → portokalli
//   danger  → kuq
// ============================================================

import { cn } from "../../lib/utils";

// toneMap - Harta e ngjyrave sipas tonit
// Çdo ton ka ngjyrën e vijës (stroke) dhe efektin e dritës (glow)
const toneMap = {
  accent: {
    stroke: "var(--accent-strong)",         // Blu
    glow: "rgba(42, 178, 255, 0.22)",       // Hije blu e butë
  },
  success: {
    stroke: "var(--success)",               // Jeshile
    glow: "rgba(52, 211, 153, 0.22)",       // Hije jeshile e butë
  },
  warning: {
    stroke: "var(--warning)",               // Portokalli
    glow: "rgba(255, 194, 102, 0.22)",      // Hije portokalli e butë
  },
  danger: {
    stroke: "var(--danger)",                // Kuq
    glow: "rgba(255, 92, 118, 0.22)",       // Hije kuqe e butë
  },
};

// Gauge - Tregues rrethor me SVG
// Parametrat:
//   value     - Vlera nga 0 deri 100 (p.sh. 87 për 87%)
//   label     - Teksti poshtë rrethit (opsionale)
//   helper    - Teksti i vogël brenda rrethit (parazgjedhja: "percent")
//   tone      - Ngjyra: "accent" | "success" | "warning" | "danger"
//   className - Klasa shtesë CSS (opsionale)
export function Gauge({ value = 0, label, helper, tone = "accent", className }) {
  // Normalizimi: sigurohu që vlera është midis 0 dhe 100
  const normalized = Math.max(0, Math.min(100, Math.round(Number(value || 0))));

  // Llogaritjet gjeometrike të rrethit SVG
  const radius = 54;                              // Rrezja e rrethit
  const circumference = 2 * Math.PI * radius;    // Gjatësia totale e rrethit (2πr)
  // dashOffset - sa pjesë e rrethit mbetet e "zbrazët"
  // Nëse value=0 → dashOffset=circumference (gjithçka zbrazët)
  // Nëse value=100 → dashOffset=0 (gjithçka e mbushur)
  const dashOffset = circumference - (normalized / 100) * circumference;

  // Merr ngjyrat sipas tonit
  const colors = toneMap[tone] || toneMap.accent;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5", className)}>
      {/* SVG - vizatimi i rrethit */}
      <svg viewBox="0 0 140 140" className="h-36 w-36">
        <defs>
          {/* Efekti i dritës (glow) për vijën e mbushur */}
          <filter id={`gauge-glow-${tone}`}>
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor={colors.glow} />
          </filter>
        </defs>

        {/* Rrethi i sfondit (gri, i plotë) */}
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--panel-border-soft)" strokeWidth="12" />

        {/* Rrethi i mbushur (me ngjyrën e tonit) */}
        {/* strokeDasharray dhe strokeDashoffset krijojnë efektin e "mbushjes" */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="12"
          strokeLinecap="round"          // Skajet e rrumbullakosura
          strokeDasharray={circumference} // Gjatësia totale
          strokeDashoffset={dashOffset}   // Sa mbetet zbrazët
          transform="rotate(-90 70 70)"  // Fillo nga lart (jo nga e djathta)
          filter={`url(#gauge-glow-${tone})`}
        />

        {/* Numri brenda rrethit (vlera numerike) */}
        <text x="70" y="66" textAnchor="middle" className="fill-[var(--foreground)] text-[30px] font-semibold">
          {normalized}
        </text>

        {/* Teksti i vogël nën numër (p.sh. "percent") */}
        <text x="70" y="88" textAnchor="middle" className="fill-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.2em]">
          {helper || "percent"}
        </text>
      </svg>

      {/* Etiketa opsionale poshtë rrethit */}
      {label ? <span className="text-sm font-medium text-[var(--foreground)]">{label}</span> : null}
    </div>
  );
}
