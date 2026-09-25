/* eslint-disable react-refresh/only-export-components */
// ============================================================
// badge.jsx - Komponenti i Etiketës (Badge)
// ============================================================
// Shfaq etiketa të vogla me ngjyra të ndryshme sipas statusit.
// Shembull: [REAL] [FAKE] [TRUSTED] [SUSPICIOUS]
// Variantet:
//   neutral    → gri  (neutral, asnjë status i veçantë)
//   info       → blu  (informacion)
//   real       → jeshile (lajm real/i vërtetë)
//   fake       → kuq (lajm i rremë)
//   uncertain  → portokalli (i pasigurt)
//   trusted    → jeshile (burim i besuar)
//   medium     → blu (burim mesatar)
//   suspicious → kuq (burim i dyshimtë)
//   unknown    → gri (i panjohur)
// ============================================================

import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

// badgeVariants - Llojet e etiketave dhe stilet e tyre CSS
// cva (class-variance-authority) menaxhon variantet e klasave
export const badgeVariants = cva(
  // Klasa bazë e aplikuar tek të gjitha etiketat
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        // neutral - gri, për info të thjeshtë
        neutral:    "border-[var(--border-strong)] bg-[var(--panel-soft)] text-[var(--muted-foreground)]",
        // info - blu, për informacione
        info:       "border-[rgba(42,178,255,0.25)] bg-[rgba(42,178,255,0.12)] text-[var(--accent-strong)]",
        // real - jeshile, për lajme të vërteta
        real:       "border-[rgba(52,211,153,0.28)] bg-[rgba(52,211,153,0.12)] text-[var(--success)]",
        // fake - kuq, për lajme të rreme
        fake:       "border-[rgba(255,92,118,0.28)] bg-[rgba(255,92,118,0.12)] text-[var(--danger)]",
        // uncertain - portokalli, kur s'ka siguri
        uncertain:  "border-[rgba(255,194,102,0.28)] bg-[rgba(255,194,102,0.12)] text-[var(--warning)]",
        // trusted - jeshile, për burime të besuara
        trusted:    "border-[rgba(52,211,153,0.28)] bg-[rgba(52,211,153,0.12)] text-[var(--success)]",
        // medium - blu, për burime me besueshmëri mesatare
        medium:     "border-[rgba(42,178,255,0.25)] bg-[rgba(42,178,255,0.12)] text-[var(--accent-strong)]",
        // suspicious - kuq, për burime të dyshimta
        suspicious: "border-[rgba(255,92,118,0.28)] bg-[rgba(255,92,118,0.12)] text-[var(--danger)]",
        // unknown - gri, kur statusi nuk dihet
        unknown:    "border-[var(--border-strong)] bg-[var(--panel-soft)] text-[var(--muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "neutral",  // Varianti parazgjedhës kur s'specifikohet
    },
  }
);

// Badge - Komponenti i etiketës
// Parametrat:
//   className - Klasa shtesë CSS (opsionale)
//   variant   - Lloji i etiketës (shih variantet lart)
//   ...props  - Çdo atribut tjetër HTML (p.sh. children për tekstin)
export function Badge({ className, variant, ...props }) {
  // Rendo si <span> me klasat e duhura
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
