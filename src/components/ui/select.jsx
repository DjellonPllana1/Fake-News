// ============================================================
// select.jsx - Lista Zgjedhëse (Select / Dropdown)
// ============================================================
// Komponenti standard për zgjedhjen nga një listë opsionesh.
// Kur klikohet, hap një listë me opsionet e disponueshme.
//
// Shembull:
//   <Select value={val} onChange={handleChange}>
//     <option value="real">Real</option>
//     <option value="fake">Fake</option>
//   </Select>
// ============================================================

import { cn } from "../../lib/utils";

// Select - Lista zgjedhëse
// Parametrat:
//   className - Klasa shtesë CSS (opsionale)
//   children  - Opsionet <option> brenda listës
//   ...props  - Çdo atribut HTML i <select>:
//               value, onChange, disabled, multiple, etj.
export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        // Stilet bazë: njëjtë si Input për konsistencë vizuale
        // focus: tregon kufirin e theksuar dhe unazën blu
        "h-12 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input)] px-4 text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition-all duration-200 focus:border-[var(--border-emphasis)] focus:ring-2 focus:ring-[var(--ring)]/35",
        className
      )}
      {...props}  // Kalo të gjithë atributet e dhëna
    >
      {/* children = <option> elementet */}
      {children}
    </select>
  );
}
