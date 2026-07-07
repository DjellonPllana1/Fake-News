/* eslint-disable react-refresh/only-export-components */
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, Sparkles, X } from "lucide-react";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";

const NotificationsContext = createContext(null);
const MotionToast = motion.div;
const MotionPanel = motion.div;

const toneMeta = {
  success: {
    icon: CheckCircle2,
    label: "Success",
    toneClass: "text-[var(--success)]",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    toneClass: "text-[var(--warning)]",
  },
  error: {
    icon: AlertTriangle,
    label: "Error",
    toneClass: "text-[var(--danger)]",
  },
  info: {
    icon: Info,
    label: "Info",
    toneClass: "text-[var(--accent-strong)]",
  },
};

function buildNotification(payload = {}) {
  return {
    id: `toast-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    title: payload.title || toneMeta[payload.tone || "info"]?.label || "Notification",
    message: payload.message || "",
    tone: payload.tone || "info",
    createdAt: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    persistent: Boolean(payload.persistent),
    ttl: Number(payload.ttl || 4200),
  };
}

function NotificationItem({ item, onDismiss, compact = false }) {
  const Icon = toneMeta[item.tone]?.icon || Bell;
  const toneClass = toneMeta[item.tone]?.toneClass || toneMeta.info.toneClass;

  return (
    <article className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4 shadow-[var(--shadow-card)] backdrop-blur-2xl">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel-soft)] ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <strong className="text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
            <span className="text-xs text-[var(--muted-foreground)]">{item.createdAt}</span>
          </div>
          {item.message ? <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item.message}</p> : null}
        </div>
        {!compact ? (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onDismiss(item.id)} aria-label="Dismiss notification">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const notify = useCallback((payload) => {
    const notification = buildNotification(payload);
    setNotifications((current) => [notification, ...current].slice(0, 8));
    return notification.id;
  }, []);

  useEffect(() => {
    const timers = notifications
      .filter((item) => !item.persistent)
      .map((item) => window.setTimeout(() => dismiss(item.id), item.ttl));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismiss, notifications]);

  const value = useMemo(
    () => ({
      notifications,
      notify,
      dismiss,
      clearAll,
    }),
    [clearAll, dismiss, notifications, notify]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        <AnimatePresence initial={false}>
          {notifications.slice(0, 4).map((item) => (
            <MotionToast
              key={item.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto"
            >
              <NotificationItem item={item} onDismiss={dismiss} />
            </MotionToast>
          ))}
        </AnimatePresence>
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationsContext);

  if (!value) {
    throw new Error("useNotifications must be used inside NotificationsProvider.");
  }

  return value;
}

export function NotificationCenter() {
  const { notifications, clearAll, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="icon" className="relative h-11 w-11 rounded-2xl" onClick={() => setOpen((current) => !current)} aria-label="Open notifications">
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warning)] px-1 text-[10px] font-bold text-slate-950">
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </Button>

      <AnimatePresence>
        {open ? (
          <MotionPanel
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+0.9rem)] z-50 w-[min(420px,92vw)] rounded-[30px] border border-[var(--border-subtle)] bg-[var(--panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div className="space-y-2">
                <span className="eyebrow">Notifications</span>
                <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Activity Stream</h3>
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">Recent platform events, exports, and analysis outcomes appear here.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>

            <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-1">
              {notifications.length ? (
                notifications.map((item) => <NotificationItem key={item.id} item={item} onDismiss={dismiss} compact />)
              ) : (
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
