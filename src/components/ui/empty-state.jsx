// ============================================================
// empty-state.jsx - Gjendja Bosh (Empty State)
// ============================================================
// Shfaqet kur nuk ka të dhëna për të shfaqur.
// Shembull: kur historia e analizave është bosh, ose
// kur nuk ka njoftimet.
//
// Shfaq:
//   - Ikonë dekorative
//   - Titull (p.sh. "Asnjë analizë akoma")
//   - Përshkrim (p.sh. "Fillo duke analizuar një artikull")
//   - Butona opsionale (veprime për të filluar)
// ============================================================

import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

// EmptyState - Komponenti i gjendjes bosh
// Parametrat:
//   icon        - Ikona (komponenti nga Lucide, parazgjedhja: Sparkles ✨)
//   title       - Titulli i mesazhit bosh
//   description - Teksti shpjegues
//   className   - Klasa shtesë CSS (opsionale)
//   children    - Butona ose veprime opsionale poshtë tekstit
export function EmptyState({ icon = Sparkles, title, description, className, children }) {
  const Icon = icon;  // Kofiguro komponentin e ikonës

  return (
    <div
      className={cn(
        // Kontejner me kufi me pika dhe sfond të butë
        "flex min-h-[240px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--panel-soft)] px-6 py-10 text-center",
        className
      )}
    >
      {/* Kutia e ikonës në qendër */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] text-[var(--accent-strong)]">
        <Icon className="h-5 w-5" />
      </div>

      {/* Titulli kryesor */}
      <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{title}</h3>

      {/* Teksti shpjegues */}
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">{description}</p>

      {/* Zona e aksioneve - shfaqet vetëm nëse ka fëmijë (children) */}
      {children ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </div>
  );
}
