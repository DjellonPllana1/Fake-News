// ============================================================
// input.jsx - Fusha e Hyrjes së Tekstit (Input)
// ============================================================
// Komponenti standard për fushat e hyrjes së tekstit.
// Stilizuar në mënyrë uniforme me gjithë aplikacionin.
//
// Shembull: <Input placeholder="Shkruaj tekstin..." />
// ============================================================

import { cn } from "../../lib/utils";

// Input - Fusha e hyrjes së tekstit
// Parametrat:
//   className - Klasa shtesë CSS (opsionale)
//   ...props  - Çdo atribut HTML i <input>:
//               type, placeholder, value, onChange, disabled, etj.
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        // Stilet bazë: lartësi, gjerësi, rreze, kufi, sfond, tekst
        // focus: tregon kufirin e theksuar dhe unazën blu kur klikon në fushë
        "h-12 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input)] px-4 text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition-all duration-200 placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-emphasis)] focus:ring-2 focus:ring-[var(--ring)]/35",
        className
      )}
      {...props}  // Kalo të gjithë atributet e dhëna (p.sh. type="email")
    />
  );
}
