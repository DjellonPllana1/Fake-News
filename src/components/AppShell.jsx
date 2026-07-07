import { AnimatePresence, motion } from "framer-motion";
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
  Menu,
  MoonStar,
  PanelLeftClose,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { NAVIGATION_ORDER, ROUTES } from "../constants";
import { cn } from "../lib/utils";
import { NotificationCenter } from "./Notifications";
import { useTheme } from "./ThemeProvider";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

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

const MotionBackdrop = motion.button;
const MotionSidebar = motion.div;
const MotionContent = motion.div;

function buildInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function NavigationLink({ item, icon, active, onClick }) {
  const Icon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left transition-all duration-200",
        active
          ? "border-[var(--border-emphasis)] bg-[linear-gradient(135deg,rgba(104,213,255,0.16),rgba(123,215,255,0.05))] text-[var(--foreground)] shadow-[0_18px_40px_rgba(42,178,255,0.12)]"
          : "border-transparent bg-transparent text-[var(--muted-foreground)] hover:border-[var(--border-subtle)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200",
          active
            ? "border-[var(--border-emphasis)] bg-[rgba(42,178,255,0.12)] text-[var(--accent-strong)]"
            : "border-[var(--border-subtle)] bg-[var(--panel-soft)] text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="space-y-1">
        <strong className="block text-sm font-semibold">{item.title}</strong>
        <span className="block text-xs leading-5 text-[var(--muted-foreground)]">{item.description}</span>
      </span>
    </button>
  );
}

function Sidebar({ route, session, visibleRoutes, onNavigate, onLogout, onClose }) {
  const initials = buildInitials(session.user.name || session.user.email);

  return (
    <aside className="surface-card flex h-full min-h-[calc(100vh-1.5rem)] flex-col gap-6 p-5 lg:min-h-[calc(100vh-2rem)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(104,213,255,0.22),rgba(255,255,255,0.08))] text-[var(--foreground)]">
            <Activity className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <strong className="block font-display text-lg font-semibold tracking-[-0.04em]">Verity Lens</strong>
            <span className="block text-xs text-[var(--muted-foreground)]">AI credibility operations platform</span>
          </div>
        </div>

        <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label="Close menu">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Workspace</span>
          <Badge variant="neutral">{visibleRoutes.length} views</Badge>
        </div>

        <nav className="flex-1 space-y-2 overflow-auto pr-1">
          {visibleRoutes.map((key) => {
            const item = ROUTES[key];
            const Icon = iconMap[key] || LayoutDashboard;

            return (
              <NavigationLink
                key={key}
                item={item}
                icon={Icon}
                active={route === key}
                onClick={() => {
                  onNavigate(key);
                  onClose();
                }}
              />
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 border-t border-[var(--border-subtle)] pt-5">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(104,213,255,0.22),rgba(52,211,153,0.16))] text-sm font-bold text-[var(--foreground)]">
              {initials || "VL"}
            </div>
            <div className="min-w-0 space-y-1">
              <strong className="block truncate text-sm font-semibold text-[var(--foreground)]">{session.user.name}</strong>
              <span className="block truncate text-xs text-[var(--muted-foreground)]">{session.user.email}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Badge variant="info">{session.user.role}</Badge>
            <Button type="button" variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ route, session, onNavigate, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const currentRoute = ROUTES[route] || ROUTES.dashboard;
  const CurrentRouteIcon = iconMap[route] || LayoutDashboard;
  const visibleRoutes = useMemo(
    () =>
      NAVIGATION_ORDER.filter((key) => {
        const item = ROUTES[key];
        return !item.roles?.length || item.roles.includes(session.user.role);
      }),
    [session.user.role]
  );

  return (
    <div className="relative min-h-screen px-3 py-3 lg:px-4 lg:py-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-[rgba(52,211,153,0.12)] blur-3xl" />
        <div className="absolute right-[8%] top-0 h-72 w-72 rounded-full bg-[rgba(104,213,255,0.16)] blur-3xl" />
        <div className="absolute bottom-[18%] right-[-40px] h-56 w-56 rounded-full bg-[rgba(255,194,102,0.12)] blur-3xl" />
      </div>

      <div className="relative z-10 grid min-h-[calc(100vh-1.5rem)] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <Sidebar
            route={route}
            session={session}
            visibleRoutes={visibleRoutes}
            onNavigate={onNavigate}
            onLogout={onLogout}
            onClose={() => setMenuOpen(false)}
          />
        </div>

        <AnimatePresence>
          {menuOpen ? (
            <>
              <MotionBackdrop
                type="button"
                aria-label="Close navigation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
              />
              <MotionSidebar
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-y-3 left-3 z-50 w-[min(320px,calc(100vw-1.5rem))] lg:hidden"
              >
                <Sidebar
                  route={route}
                  session={session}
                  visibleRoutes={visibleRoutes}
                  onNavigate={onNavigate}
                  onLogout={onLogout}
                  onClose={() => setMenuOpen(false)}
                />
              </MotionSidebar>
            </>
          ) : null}
        </AnimatePresence>

        <main className="min-w-0 space-y-4">
          <header className="surface-card sticky top-3 z-30 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between lg:top-4">
            <div className="flex min-w-0 items-start gap-3">
              <Button type="button" variant="outline" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>

              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow">Executive Workspace</span>
                  <Badge variant="info">
                    <CurrentRouteIcon className="h-3.5 w-3.5" />
                    {currentRoute.title}
                  </Badge>
                  <Badge variant="neutral">
                    <Sparkles className="h-3.5 w-3.5" />
                    {session.user.role}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-[clamp(2rem,3vw,3rem)] font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                    {currentRoute.title}
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{currentRoute.description}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
              <NotificationCenter />
            </div>
          </header>

          <MotionContent
            key={route}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="space-y-4"
          >
            {children}
          </MotionContent>
        </main>
      </div>
    </div>
  );
}
