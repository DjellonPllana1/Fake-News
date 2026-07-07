/* eslint-disable react-refresh/only-export-components */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

const MotionDiv = motion.div;

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, hideClose = false }) {
  return (
    <DialogPrimitive.Portal>
      <AnimatePresence>
        <DialogPrimitive.Overlay asChild forceMount>
          <MotionDiv
            className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </DialogPrimitive.Overlay>
      </AnimatePresence>

      <AnimatePresence>
        <DialogPrimitive.Content asChild forceMount>
          <MotionDiv
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-[min(1100px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop-blur-2xl dark:bg-slate-950/88 dark:border-white/10 md:p-6",
              className
            )}
          >
            {!hideClose ? (
              <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/5 bg-black/[0.03] text-slate-500 transition hover:bg-black/[0.06] hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            ) : null}
            {children}
          </MotionDiv>
        </DialogPrimitive.Content>
      </AnimatePresence>
    </DialogPrimitive.Portal>
  );
}
