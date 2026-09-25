/* eslint-disable react-refresh/only-export-components */
// ============================================================
// Notifications.jsx - Sistemi i Njoftimeve (Toast & Panel)
// ============================================================
// Ky skedar menaxhon të gjitha njoftimet në aplikacion:
//
// 1. Toast-et - mesazhet e vogla që shfaqen në këndin e djathtë
//    lart të ekranit dhe zhduken automatikisht pas disa sekondash.
// 2. NotificationCenter - paneli me të gjitha njoftimet, që
//    hapet duke klikuar butonin e ziles.
//
// Llojet e njoftimeve:
//   success  → gjelbër (sukses)
//   warning  → portokalli (paralajmërim)
//   error    → kuq (gabim)
//   info     → blu (informacion)
// ============================================================

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, Sparkles, X } from "lucide-react";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";

// Context - i tillë si një "kanal komunikimi" global për njoftimet
const NotificationsContext = createContext(null);

// Versione të animuara të elementeve HTML (framer-motion)
const MotionToast = motion.div;    // Toast me animacion
const MotionPanel = motion.div;    // Panel me animacion

// toneMeta - Harta e metadatave sipas llojit të njoftimit
// Çdo lloj ka ikonën dhe ngjyrën e vet
const toneMeta = {
  success: {
    icon: CheckCircle2,                        // Ikona e suksesit (✓)
    label: "Success",
    toneClass: "text-[var(--success)]",        // Ngjyrë jeshile
  },
  warning: {
    icon: AlertTriangle,                       // Ikona e trekëndëshit të paralajmërimit
    label: "Warning",
    toneClass: "text-[var(--warning)]",        // Ngjyrë portokalli
  },
  error: {
    icon: AlertTriangle,                       // E njëjta ikonë për gabime
    label: "Error",
    toneClass: "text-[var(--danger)]",         // Ngjyrë kuqe
  },
  info: {
    icon: Info,                                // Ikona e informacionit (i)
    label: "Info",
    toneClass: "text-[var(--accent-strong)]",  // Ngjyrë blu
  },
};

// buildNotification - Ndërto objektin e njoftimit nga të dhënat hyrëse
// Gjeneron gjithashtu një ID unike dhe kohën aktuale
function buildNotification(payload = {}) {
  return {
    // ID unike: kombinim i timestamp dhe numrit të rastësishëm
    id: `toast-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    // Titulli: ose i dhënë, ose etiketa e llojit (p.sh. "Success")
    title: payload.title || toneMeta[payload.tone || "info"]?.label || "Notification",
    message: payload.message || "",           // Teksti i detajuar (opsionale)
    tone: payload.tone || "info",             // Lloji i njoftimit
    // Koha aktuale e formatuar (p.sh. "14:30")
    createdAt: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    // persistent: nëse true, nuk zhduket automatikisht
    persistent: Boolean(payload.persistent),
    // ttl (time to live): sa milisekonda shfaqet (parazgjedhje: 4200ms = 4.2 sekonda)
    ttl: Number(payload.ttl || 4200),
  };
}

// NotificationItem - Njoftimi individual (shfaqet si toast ose brenda panelit)
// Parametrat:
//   item     - Objekti i njoftimit
//   onDismiss - Funksioni për ta fshirë njoftimin
//   compact  - Nëse true, nuk shfaq butonin X (për panelin e listës)
function NotificationItem({ item, onDismiss, compact = false }) {
  // Merr ikonën dhe ngjyrën e duhur sipas llojit të njoftimit
  const Icon = toneMeta[item.tone]?.icon || Bell;
  const toneClass = toneMeta[item.tone]?.toneClass || toneMeta.info.toneClass;

  return (
    <article className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4 shadow-[var(--shadow-card)] backdrop-blur-2xl">
      <div className="flex items-start gap-3">
        {/* Ikona e njoftimit me ngjyrën e duhur */}
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel-soft)] ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {/* Rreshti me titull dhe kohën */}
          <div className="flex items-start justify-between gap-3">
            <strong className="text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
            <span className="text-xs text-[var(--muted-foreground)]">{item.createdAt}</span>
          </div>
          {/* Mesazhi shpjegues (shfaqet vetëm nëse ka) */}
          {item.message ? <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item.message}</p> : null}
        </div>
        {/* Butoni X për ta fshirë - shfaqet vetëm kur nuk jemi në mod kompakt */}
        {!compact ? (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onDismiss(item.id)} aria-label="Dismiss notification">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

// NotificationsProvider - Mbështjellësi kryesor i sistemit të njoftimeve
// Duhet të rrethohet rreth gjithë aplikacionit.
// Menaxhon listën e njoftimeve dhe i shpërndan funksionet e kontrollit.
export function NotificationsProvider({ children }) {
  // Lista e njoftimeve aktive
  const [notifications, setNotifications] = useState([]);

  // dismiss - Fshi njoftimin me ID-në e dhënë
  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  // clearAll - Fshi të gjitha njoftimet menjëherë
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // notify - Shto njoftim të ri
  // Kufizo listën në max 8 njoftimet e fundit
  const notify = useCallback((payload) => {
    const notification = buildNotification(payload);
    setNotifications((current) => [notification, ...current].slice(0, 8));
    return notification.id;  // Ktheje ID-në e njoftimit të ri
  }, []);

  // Efekti i fshirjes automatike - ekzekutohet çdo herë që lista ndryshon
  useEffect(() => {
    // Vendos timer për çdo njoftim që nuk është "persistent"
    const timers = notifications
      .filter((item) => !item.persistent)  // Filtro vetëm ato që kanë jetëgjatësi
      .map((item) => window.setTimeout(() => dismiss(item.id), item.ttl));  // Fshi pas "ttl" ms

    // Kur efekti ristarton ose komponenti zhduket, fshi të gjithë timers
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismiss, notifications]);

  // Objekti me të gjitha vlerat dhe funksionet që ndajmë me fëmijët
  const value = useMemo(
    () => ({
      notifications,  // Lista aktuale e njoftimeve
      notify,         // Funksion për të shtuar njoftim
      dismiss,        // Funksion për të fshirë një njoftim
      clearAll,       // Funksion për të fshirë të gjitha
    }),
    [clearAll, dismiss, notifications, notify]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {/* Renderizo fëmijët (gjithë aplikacioni) */}
      {children}
      {/* Zona e toast-eve - këndi i djathtë lart, mbi çdo gjë tjetër */}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {/* AnimatePresence: menaxhon animacionet e hyrjes/daljes */}
        <AnimatePresence initial={false}>
          {/* Shfaq vetëm 4 toast-et e para (max) */}
          {notifications.slice(0, 4).map((item) => (
            <MotionToast
              key={item.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}  {/* Fillon i zhdukur dhe lart */}
              animate={{ opacity: 1, y: 0, scale: 1 }}        {/* Shfaqet me lëvizje poshtë */}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}      {/* Zhduket me lëvizje lart */}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto"                  {/* Lejon klikime mbi toast */}
            >
              <NotificationItem item={item} onDismiss={dismiss} />
            </MotionToast>
          ))}
        </AnimatePresence>
      </div>
    </NotificationsContext.Provider>
  );
}

// useNotifications - Hook për t'u lidhur me sistemin e njoftimeve
// Shembull: const { notify } = useNotifications();
//           notify({ tone: "success", title: "Sukses!", message: "Analiza u krye." });
export function useNotifications() {
  const value = useContext(NotificationsContext);

  // Nëse thirret jashtë NotificationsProvider, hidh gabim
  if (!value) {
    throw new Error("useNotifications must be used inside NotificationsProvider.");
  }

  return value;
}

// NotificationCenter - Butoni i ziles dhe paneli i njoftimeve
// Klikimi mbi zile hap/mbyll panelin me listën e njoftimeve.
export function NotificationCenter() {
  const { notifications, clearAll, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);  // A është paneli i hapur?
  const unreadCount = notifications.length;  // Numri i njoftimeve të palexuara

  return (
    <div className="relative">
      {/* Butoni i ziles me numrin e njoftimeve mbi të */}
      <Button type="button" variant="outline" size="icon" className="relative h-11 w-11 rounded-2xl" onClick={() => setOpen((current) => !current)} aria-label="Open notifications">
        <Bell className="h-4 w-4" />
        {/* Badge me numrin - shfaqet vetëm kur ka njoftimet */}
        {unreadCount ? (
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warning)] px-1 text-[10px] font-bold text-slate-950">
            {/* Shfaq max 9 (p.sh. "9" nëse janë 10+) */}
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </Button>

      {/* Paneli i njoftimeve - shfaqet/zhduket me animacion */}
      <AnimatePresence>
        {open ? (
          <MotionPanel
            initial={{ opacity: 0, y: 10, scale: 0.98 }}   {/* Fillon pak poshtë dhe i zhdukur */}
            animate={{ opacity: 1, y: 0, scale: 1 }}        {/* Shfaqet duke lëvizur lart */}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}       {/* Zhduket duke lëvizur poshtë */}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+0.9rem)] z-50 w-[min(420px,92vw)] rounded-[30px] border border-[var(--border-subtle)] bg-[var(--panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-2xl"
          >
            {/* Kreu i panelit me titull dhe butonin "Clear all" */}
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div className="space-y-2">
                <span className="eyebrow">Notifications</span>
                <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Activity Stream</h3>
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">Recent platform events, exports, and analysis outcomes appear here.</p>
              </div>
              {/* Butoni për fshirjen e të gjitha njoftimeve */}
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>

            {/* Lista e njoftimeve me mundësi lëvizjeje (scroll) */}
            <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-1">
              {notifications.length ? (
                // Nëse ka njoftimet, shfaqi të gjitha
                notifications.map((item) => <NotificationItem key={item.id} item={item} onDismiss={dismiss} compact />)
              ) : (
                // Nëse nuk ka njoftimet, shfaq mesazhin "bosh"
                <EmptyState
                  icon={Sparkles}
                  title="No notifications yet"
                  description="Actions across the dashboard, analyzer, history, and exports will appear here."
                  className="min-h-[220px]"
                />
              )}
            </div>
          </MotionPanel>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
