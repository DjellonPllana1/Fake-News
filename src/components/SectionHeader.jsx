// ============================================================
// SectionHeader.jsx - Titulli i Seksionit
// ============================================================
// Ky komponent shfaq titullin dhe përshkrimin e çdo seksioni
// të faqes. Gjithashtu mund të ketë:
//   - Një "eyebrow" (tekst i vogël mbi titull, p.sh. "ANALIZA")
//   - Një "badge" (etiketa me ngjyrë, p.sh. "Aktiv")
//   - "actions" (butona ose kontrolle në të djathtë)
// ============================================================

import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

// SectionHeader - Titull i formatuar për seksionet e faqes
// Parametrat:
//   eyebrow   - Teksti i vogël mbi titull (opsionale)
//   title     - Titulli kryesor i seksionit (i detyrueshëm)
//   description - Teksti shpjegues poshtë titullit (opsionale)
//   actions   - Butona ose kontrolle në këndin e djathtë (opsionale)
//   badge     - Objekti { variant, label } për etiketën me ngjyrë (opsionale)
//   className - Klasa shtesë CSS (opsionale)
export function SectionHeader({ eyebrow, title, description, actions = null, badge = null, className = "" }) {
  return (
    // Në ekrane të vogla: kolona. Në ekrane të mëdha: rresht
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="space-y-3">
        {/* Rreshti i sipërm: "eyebrow" dhe "badge" krah për krah */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shfaq "eyebrow" vetëm nëse ka vlerë */}
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          {/* Shfaq "badge" vetëm nëse ka vlerë */}
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
        </div>
        <div className="space-y-2">
          {/* Titulli kryesor H2 */}
          <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)] md:text-[2rem]">{title}</h2>
          {/* Përshkrimi - shfaqet vetëm nëse është dhënë */}
          {description ? <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
      </div>
      {/* Zona e aksioneve (butona) - shfaqet vetëm nëse ka aksione */}
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
