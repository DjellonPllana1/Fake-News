import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Globe,
  HelpCircle,
  History,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { NAVIGATION_ORDER, ROUTES } from "../constants";
import { NotificationCenter } from "./Notifications";
import { useTheme } from "./ThemeProvider";

const iconMap = {
  dashboard: LayoutDashboard,
  analyze: ScanSearch,
  "url-analyzer": Globe,
  history: History,
  "model-metrics": BarChart3,
  admin: LockKeyhole,
  "system-diagnostics": ShieldCheck,
  about: HelpCircle,
};

function buildInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({ route, session, onNavigate, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const currentRoute = ROUTES[route] || ROUTES.dashboard;
  const CurrentRouteIcon = iconMap[route] || LayoutDashboard;
  const initials = buildInitials(session.user.name || session.user.email);
  const visibleRoutes = useMemo(
    () =>
      NAVIGATION_ORDER.filter((key) => {
        const item = ROUTES[key];
        return !item.roles?.length || item.roles.includes(session.user.role);
      }),
    [session.user.role]
  );

  return (
    <div className="app-shell">
      <div className="app-shell__ambient" />
      <div className="app-shell__mesh app-shell__mesh--one" />
      <div className="app-shell__mesh app-shell__mesh--two" />

      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <div className="brand-badge">
            <Activity size={20} />
          </div>
          <div>
            <strong>Verity Lens</strong>
            <span>AI credibility operating system</span>
          </div>
        </div>

        <div className="sidebar__section">
          <div className="sidebar__section-heading">
            <span>Workspace</span>
            <small>{visibleRoutes.length} views</small>
          </div>

          <nav className="sidebar__nav">
            {visibleRoutes.map((key) => {
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
                  <span className="nav-link__icon">
                    <Icon size={18} />
                  </span>
                  <span className="nav-link__content">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar__footer">
          <div className="user-card">
            <div className="user-card__avatar">{initials || "VL"}</div>
            <div>
              <strong>{session.user.name}</strong>
              <span>{session.user.role}</span>
              <small>{session.user.email}</small>
            </div>
          </div>

          <button type="button" className="ghost-button ghost-button--wide" onClick={onLogout}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace__header">
          <div className="workspace__header-main">
            <button type="button" className="toolbar-button toolbar-button--icon menu-toggle" onClick={() => setMenuOpen((value) => !value)}>
              {menuOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            <div className="workspace__headline">
              <div className="workspace__eyebrow-row">
                <span className="eyebrow">SaaS Operations View</span>
                <span className="route-pill">
                  <CurrentRouteIcon size={14} />
                  {currentRoute.title}
                </span>
                <span className="route-pill route-pill--muted">
                  <Sparkles size={14} />
                  {session.user.role}
                </span>
              </div>
              <h1>{currentRoute.title}</h1>
              <p>{currentRoute.description}</p>
            </div>
          </div>

          <div className="workspace__header-actions">
            <button type="button" className="toolbar-button" onClick={toggleTheme}>
              {theme === "dark" ? <SunMedium size={18} /> : <MoonStar size={18} />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <NotificationCenter />
          </div>
        </header>

        <div key={route} className="workspace__content page-transition">
          {children}
        </div>
      </main>
    </div>
  );
}
