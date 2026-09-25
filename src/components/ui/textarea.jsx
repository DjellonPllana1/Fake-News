// ============================================================
// textarea.jsx - Fusha e Tekstit të Gjatë (Textarea)
// ============================================================
// Komponenti për hyrjen e tekstit të gjatë (shumë rreshta).
// Përdoret kryesisht për artikullin e analizimit të tekstit.
//
// Shembull:
//   <Textarea
//     placeholder="Ngjit artikullin këtu..."
//     value={text}
//     onChange={(e) => setText(e.target.value)}
//   />
// ============================================================

import { cn } from "../../lib/utils";

// Textarea - Fusha e tekstit të gjatë
// Parametrat:
//   className - Klasa shtesë CSS (opsionale)
//   ...props  - Çdo atribut HTML i <textarea>:
//               placeholder, value, onChange, rows, disabled, etj.
export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        // min-h-[220px]: lartësia minimale 220px (rreth 10 rreshta teksti)
        // rounded-[26px]: skaje shumë të rrumbullakosura
        // focus: tregon kufirin e theksuar dhe unazën blu kur klikohet
        "min-h-[220px] w-full rounded-[26px] border border-[var(--border-strong)] bg-[var(--input)] px-4 py-3.5 text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition-all duration-200 placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-emphasis)] focus:ring-2 focus:ring-[var(--ring)]/35",
        className
      )}
      {...props}  // Kalo të gjithë atributet e dhëna (p.sh. placeholder)
    />
  );
}
