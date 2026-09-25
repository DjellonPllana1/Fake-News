/* eslint-disable react-refresh/only-export-components */
// ============================================================
// button.jsx - Komponenti i Butonit
// ============================================================
// Ky është butoni standard i aplikacionit.
// Ka pesë variante stili dhe katër madhësi.
//
// Variantet:
//   default     → kryesor blu me hije (për veprimet kryesore)
//   secondary   → gri me kufi (për veprime dytësore)
//   ghost       → transparent (pa kufi, i padukshëm)
//   outline     → me kufi të hollë (i qetë)
//   destructive → kuq (për fshirje / veprime të rrezikshme)
//
// Madhësitë:
//   default → standard
//   sm      → i vogël
//   lg      → i madh
//   icon    → katrore (vetëm për ikona, pa tekst)
// ============================================================

import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

// buttonVariants - Llojet e butonave dhe stilet e tyre CSS
// cva menaxhon kombinatat e klasave sipas variantit dhe madhësisë
export const buttonVariants = cva(
  // Klasa bazë e aplikuar tek të gjithë butonat
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // default - Butoni kryesor me ngjyrë blu dhe hije
        default:
          "border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-slate-950 shadow-[0_18px_40px_rgba(42,178,255,0.22)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(42,178,255,0.28)]",
        // secondary - Butoni dytësor me sfond gri
        secondary:
          "border-[var(--border-strong)] bg-[var(--panel-soft)] px-5 py-3 text-[var(--foreground)] hover:-translate-y-0.5 hover:border-[var(--border-emphasis)] hover:bg-[var(--panel-hover)]",
        // ghost - Butoni transparent pa kufi
        ghost:
          "border-transparent bg-transparent px-4 py-3 text-[var(--muted-foreground)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]",
        // outline - Butoni me kufi të hollë
        outline:
          "border-[var(--border-strong)] bg-[var(--panel)] px-5 py-3 text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-[var(--border-emphasis)] hover:bg-[var(--panel-hover)]",
        // destructive - Butoni i kuq për fshirje dhe veprime të rrezikshme
        destructive:
          "border-transparent bg-[linear-gradient(135deg,var(--danger),#ff9f7c)] px-5 py-3 text-white shadow-[0_18px_40px_rgba(255,92,118,0.22)] hover:-translate-y-0.5",
      },
      size: {
        default: "h-11",                         // Lartësia standarde
        sm: "h-9 rounded-xl px-3.5 text-xs",     // Butoni i vogël
        lg: "h-12 px-6 text-sm",                 // Butoni i madh
        icon: "h-11 w-11 rounded-2xl p-0",       // Butoni katrore (vetëm ikonë)
      },
    },
    defaultVariants: {
      variant: "default",   // Varianti parazgjedhës: kryesor blu
      size: "default",      // Madhësia parazgjedhëse: standarde
    },
  }
);

// Button - Komponenti i butonit
// Parametrat:
//   className - Klasa shtesë CSS (opsionale)
//   variant   - Lloji i butonit (shih variantet lart)
//   size      - Madhësia e butonit (shih madhësitë lart)
//   asChild   - Nëse true, butoni nuk rendo <button> por fëmijën e tij
//   ...props  - Çdo atribut tjetër HTML (p.sh. onClick, disabled, type)
export function Button({ className, variant, size, asChild = false, ...props }) {
  // Nëse asChild=true, përdor Slot (ridirektim tek fëmija)
  // Nëse jo, përdor <button> standard
  const Comp = asChild ? Slot : "button";

  // Shto type="button" automatikisht nëse nuk është dhënë
  // (parandalon submit aksidental në formular)
  const resolvedProps = !asChild && !props.type ? { ...props, type: "button" } : props;

  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...resolvedProps} />;
}
