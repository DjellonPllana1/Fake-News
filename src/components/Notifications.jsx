/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, Sparkles, X } from "lucide-react";

const NotificationsContext = createContext(null);

const toneMeta = {
  success: {
    icon: CheckCircle2,
    label: "Success",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
  },
  error: {
    icon: AlertTriangle,
    label: "Error",
  },
  info: {
    icon: Info,
    label: "Info",
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

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  function dismiss(id) {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }

  function clearAll() {
    setNotifications([]);
  }

  function notify(payload) {
    const notification = buildNotification(payload);
    setNotifications((current) => [notification, ...current].slice(0, 8));
    return notification.id;
  }

  useEffect(() => {
    const timers = notifications
      .filter((item) => !item.persistent)
      .map((item) => window.setTimeout(() => dismiss(item.id), item.ttl));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      notify,
      dismiss,
      clearAll,
    }),
    [notifications]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {notifications.slice(0, 4).map((item) => {
          const Icon = toneMeta[item.tone]?.icon || Bell;

          return (
            <article key={item.id} className={`toast toast--${item.tone}`}>
              <div className="toast__icon">
                <Icon size={18} />
              </div>
              <div className="toast__content">
                <strong>{item.title}</strong>
                {item.message ? <p>{item.message}</p> : null}
                <small>{item.createdAt}</small>
              </div>
              <button type="button" className="toast__close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">
                <X size={14} />
              </button>
            </article>
          );
        })}
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
    <div className="notification-center">
      <button
        type="button"
        className="toolbar-button toolbar-button--icon"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open notifications"
      >
        <Bell size={18} />
        {unreadCount ? <span className="toolbar-badge">{Math.min(unreadCount, 9)}</span> : null}
      </button>

      {open ? (
        <div className="notification-center__panel">
          <div className="notification-center__header">
            <div>
              <span className="eyebrow">Notifications</span>
              <h3>Activity Stream</h3>
            </div>
            <button type="button" className="ghost-button ghost-button--compact" onClick={clearAll}>
              Clear all
            </button>
          </div>

          {notifications.length ? (
            <div className="notification-center__list">
              {notifications.map((item) => {
                const Icon = toneMeta[item.tone]?.icon || Sparkles;

                return (
                  <article key={item.id} className={`notification-center__item notification-center__item--${item.tone}`}>
                    <div className="notification-center__item-icon">
                      <Icon size={16} />
                    </div>
                    <div>
                      <strong>{item.title}</strong>
                      {item.message ? <p>{item.message}</p> : null}
                      <small>{item.createdAt}</small>
                    </div>
                    <button type="button" className="ghost-button ghost-button--compact" onClick={() => dismiss(item.id)}>
                      Dismiss
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state empty-state--compact">No notifications yet. Actions across the app will appear here.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
