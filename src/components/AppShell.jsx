import { useState } from "react";
import { Activity, BarChart3, Globe, HelpCircle, History, LayoutDashboard, LogOut, ScanSearch, ShieldCheck } from "lucide-react";
import { NAVIGATION_ORDER, ROUTES } from "../constants";

const iconMap = {
  dashboard: LayoutDashboard,
  analyze: ScanSearch,
  "url-analyzer": Globe,
  history: History,
  "model-metrics": BarChart3,
  "system-diagnostics": ShieldCheck,
  about: HelpCircle,
};

export function AppShell({ route, session, onNavigate, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentRoute = ROUTES[route] || ROUTES.dashboard;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <div className="brand-badge">
            <Activity size={20} />
          </div>
          <div>
            <strong>Verity Lens</strong>
            <span>Fake News Intelligence Platform</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAVIGATION_ORDER.map((key) => {
            const item = ROUTES[key];
            const Icon = iconMap[key];
            const isActive = route === key;

            return (
              <button
                key={key}
                type="button"
                className={`nav-link ${isActive ? "nav-link--active" : ""}`}
                onClick={() => {
                  onNavigate(key);
                  setMenuOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="user-card">
            <strong>{session.user.name}</strong>
            <span>{session.user.role}</span>
            <small>{session.user.email}</small>
          </div>

          <button type="button" className="ghost-button" onClick={onLogout}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace__header">
          <button type="button" className="menu-toggle" onClick={() => setMenuOpen((value) => !value)}>
            Menu
          </button>

          <div>
            <span className="eyebrow">Operational View</span>
            <h1>{currentRoute.title}</h1>
            <p>{currentRoute.description}</p>
          </div>
        </header>

        <div className="workspace__content">{children}</div>
      </main>
    </div>
  );
}
