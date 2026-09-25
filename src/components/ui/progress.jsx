// ============================================================
// progress.jsx - Shiriti i Progresit (Progress Bar)
// ============================================================
// Shfaq një shirit horizontal që tregon progresin ose nivelin
// e diçkaje si përqindje (0-100%).
//
// Variantet e ngjyrave (tone):
//   accent  → blu (parazgjedhja)
//   success → jeshile
//   warning → portokalli
//   danger  → kuq
//
// Shembull: [=====-------] 45%  "Probabiliteti i Rremësisë"
// ============================================================

import { cn } from "../../lib/utils";

// ProgressBar - Shiriti i progresit
// Parametrat:
//   label     - Emërtimi i shiritit (p.sh. "Probabiliteti i Rremësisë")
//   value     - Vlera nga 0 deri 100
//   helper    - Teksti djathtas (p.sh. "45%" ose "45/100"), opsionale
//   tone      - Ngjyra: "accent" | "success" | "warning" | "danger"
//   className - Klasa shtesë CSS (opsionale)
export function ProgressBar({ label, value = 0, helper, tone = "accent", className }) {
  // Normalizimi: sigurohu që vlera është midis 0 dhe 100 dhe është numër i plotë
  const percentage = Math.max(0, Math.min(100, Math.round(Number(value || 0))));

  // Cakto stilin CSS sipas tonit (ngjyrës)
  // Stilet janë specifike për web-kit (Chrome) dhe Mozilla (Firefox)
  const toneClass =
    tone === "danger"
      ? "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--danger),#ff9f7c)] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--danger),#ff9f7c)]"       // Kuq
      : tone === "warning"
        ? "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--warning),#ffd173)] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--warning),#ffd173)]"   // Portokalli
        : tone === "success"
          ? "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--success),#8df6c7)] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--success),#8df6c7)]" // Jeshile
          : "[&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]"; // Blu (parazgjedhje)

  return (
    <div className={cn("space-y-2", className)}>
      {/* Rreshti i sipërm: etiketa majtas dhe vlera djathtas */}
      {(label || helper) && (
        <div className="flex items-center justify-between gap-3 text-sm">
          {/* Emërtimi i shiritit */}
          <span className="text-[var(--muted-foreground)]">{label}</span>
          {/* Vlera (ose helper nëse është dhënë, përndryshe "45%") */}
          <span className="font-medium text-[var(--foreground)]">{helper || `${percentage}%`}</span>
        </div>
      )}
      {/* Elementi HTML <progress> me stilin e duhur */}
      <progress
        className={cn(
          "progress-track h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--panel-soft)]",
          toneClass
        )}
        max="100"       {/* Vlera maksimale */}
        value={percentage}  {/* Vlera aktuale */}
      />
    </div>
  );
}
