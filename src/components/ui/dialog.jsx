/* eslint-disable react-refresh/only-export-components */
// ============================================================
// dialog.jsx - Dritarja Modale (Dialog / Popup)
// ============================================================
// Shfaq një dritare që hapet mbi faqen kryesore (popup/modal).
// Përdoret për forma, konfirmime dhe shfaqje detajesh.
//
// Struktura:
//   Dialog        → Kontejneri kryesor (menaxhon hapje/mbyllje)
//   DialogTrigger → Elementi që hap dialogun (butoni)
//   DialogContent → Dritarja e popupit me animacion
//   DialogTitle   → Titulli i dialogut
//   DialogDescription → Përshkrimi i dialogut
//   DialogClose   → Butoni ose elementi për mbyllje
//
// Shembull:
//   <Dialog open={isOpen} onOpenChange={setIsOpen}>
//     <DialogTrigger>Hap</DialogTrigger>
//     <DialogContent>
//       <DialogTitle>Titulli</DialogTitle>
//       <p>Përmbajtja...</p>
//     </DialogContent>
//   </Dialog>
// ============================================================

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

// Versioni i animuar i div (framer-motion)
const MotionDiv = motion.div;

// Dialog - Kontejneri kryesor i dialogut
// Parametrat:
//   open         - A është dialogu i hapur? (true/false)
//   onOpenChange - Funksioni i thirrur kur hapet/mbyllet dialogu
//   children     - Elementet brenda dialogut
export function Dialog({ open, onOpenChange, children }) {
  return (
    // DialogPrimitive.Root - menaxhon gjendjen e hapur/mbyllur
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

// Eksportime të drejtpërdrejta nga Radix UI primitive
export const DialogTrigger    = DialogPrimitive.Trigger;     // Elementi aktivizues
export const DialogTitle      = DialogPrimitive.Title;       // Titulli (i detyrueshëm për aksesibilitet)
export const DialogDescription = DialogPrimitive.Description; // Përshkrimi
export const DialogClose      = DialogPrimitive.Close;       // Mbyllësi

// DialogContent - Dritarja e popupit me animacion
// Parametrat:
//   className  - Klasa shtesë CSS (opsionale)
//   children   - Përmbajtja e dialogut
//   hideClose  - Nëse true, fshih butonin X të mbylljes
export function DialogContent({ className, children, hideClose = false }) {
  return (
    // Portal - renderizoni dialogun jashtë pemës DOM normale
    // (direkt brenda <body> për të shmangur problemet me z-index)
    <DialogPrimitive.Portal>
      {/* Sfond i errët me turbullim (backdrop) */}
      <AnimatePresence>
        <DialogPrimitive.Overlay asChild forceMount>
          <MotionDiv
            className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}   {/* Fillon i padukshëm */}
            animate={{ opacity: 1 }}   {/* Shfaqet gradualisht */}
            exit={{ opacity: 0 }}      {/* Zhduket gradualisht */}
          />
        </DialogPrimitive.Overlay>
      </AnimatePresence>

      {/* Dritarja e dialogut me animacion */}
      <AnimatePresence>
        <DialogPrimitive.Content asChild forceMount>
          <MotionDiv
            initial={{ opacity: 0, y: 24, scale: 0.98 }}   {/* Fillon pak poshtë dhe i vogël */}
            animate={{ opacity: 1, y: 0, scale: 1 }}        {/* Shfaqet duke lëvizur lart */}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}       {/* Zhduket duke lëvizur poshtë */}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              // E qendrorizuar horizontalisht dhe vertikalisht në ekran
              "fixed left-1/2 top-1/2 z-50 w-[min(1100px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop-blur-2xl dark:bg-slate-950/88 dark:border-white/10 md:p-6",
              className
            )}
          >
            {/* Butoni X për mbyllje - shfaqet vetëm nëse hideClose=false */}
            {!hideClose ? (
              <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/5 bg-black/[0.03] text-slate-500 transition hover:bg-black/[0.06] hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            ) : null}

            {/* Përmbajtja e dialogut */}
            {children}
          </MotionDiv>
        </DialogPrimitive.Content>
      </AnimatePresence>
    </DialogPrimitive.Portal>
  );
}
