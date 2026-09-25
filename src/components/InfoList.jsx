// ============================================================
// InfoList.jsx - Listë e thjeshtë çifte Etiketë / Vlerë
// ============================================================
// Ky komponent shfaq një listë informacionesh në formatin:
//   [ Emërtimi ]  ........  [ Vlera ]
// Për shembull: "Domain" → "bbc.com", "Besueshmëria" → "E lartë"
// ============================================================

import { cn } from "../lib/utils";

// InfoList - Shfaq një listë me çifte etiketë-vlerë
// Parametrat:
//   items    - Lista e objekteve { label: "...", value: "..." }
//   className - Klasa shtesë CSS (opsionale)
export function InfoList({ items = [], className = "" }) {
  return (
    // cn() bashkon klasat CSS duke shmangur hapësirat e tepërta
    <div className={cn("space-y-3", className)}>
      {/* Shko nëpër secilin element të listës dhe shfaqe */}
      {items.map((item) => (
        <div
          key={item.label}  {/* React ka nevojë për "key" unike për çdo element liste */}
          className="flex flex-col gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel-soft)] px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4"
        >
          {/* Emërtimi (label) - tekst i zbehtë në të majtë */}
          <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
          {/* Vlera (value) - tekst i theksuar në të djathtë */}
          <strong className="text-sm font-semibold text-[var(--foreground)]">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
