// ============================================================
// card.jsx - Komponentet e Kartës
// ============================================================
// Kartën e aplikacionit e përbëjnë disa pjesë:
//
//   Card         → Kontejneri kryesor (kutia e bardhë/e errët)
//   CardHeader   → Kreu i kartës (titulli + veprimet)
//   CardTitle    → Titulli i kartës
//   CardDescription → Përshkrimi / teksti shpjegues
//   CardContent  → Zona kryesore e përmbajtjes brenda kartës
//
// Shembull përdorimi:
//   <Card>
//     <CardHeader>
//       <CardTitle>Titulli Im</CardTitle>
//       <CardDescription>Përshkrimi im</CardDescription>
//     </CardHeader>
//     <CardContent>Përmbajtja...</CardContent>
//   </Card>
// ============================================================

import { cn } from "../../lib/utils";

// Card - Kontejneri kryesor i kartës
// Mund të marrë klasa shtesë CSS dhe çdo atribut HTML
export function Card({ className, children, ...props }) {
  return (
    // surface-card - klasa CSS bazë që jep pamjen e kartës (sfond + kufi + rreze)
    <section className={cn("surface-card", className)} {...props}>
      {children}
    </section>
  );
}

// CardHeader - Kreu i kartës
// Shfaqet me kufi të poshtëm ndarës dhe mund të ketë veprime djathtas
export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-5 md:flex-row md:items-start md:justify-between", className)} {...props}>
      {children}
    </div>
  );
}

// CardTitle - Titulli kryesor i kartës (H2)
// Stilizuar me font të madh dhe të bold
export function CardTitle({ className, children, ...props }) {
  return (
    <h2 className={cn("font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)] md:text-2xl", className)} {...props}>
      {children}
    </h2>
  );
}

// CardDescription - Teksti shpjegues nën titull
// Shfaqet me ngjyrë gri (muted) dhe madhësi të vogël
export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]", className)} {...props}>
      {children}
    </p>
  );
}

// CardContent - Zona kryesore e përmbajtjes brenda kartës
// Shton hapësirë vertikale mes elementeve fëmijë
export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {children}
    </div>
  );
}
