// ============================================================
// AppShell.jsx - Korniza Kryesore e Aplikacionit
// ============================================================
// Ky është "skeleti" i gjithë aplikacionit. Menaxhon:
//
// 1. Sidebar-in (paneli navigues në të majtë)
//    - Emri i aplikacionit dhe ikonat e navigimit
//    - Informacionet e përdoruesit (emri, email, roli)
//    - Butoni i daljes (Log Out)
//
// 2. Header-in (kryet e faqes)
//    - Titulli i faqes aktuale
//    - Butoni për ndryshimin e temës (dark/light)
//    - Qendra e njoftimeve (ziles)
//
// 3. Zonën kryesore të përmbajtjes (children)
//    - Faqja aktuale renderizohet brenda kësaj zone
//
// 4. Navigimin celular (hamburger menu)
//    - Në ekrane të vogla, sidebar-i fshihet pas butonit ≡
// ============================================================

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

// iconMap - Lidh çdo rrugë navigimi me ikonën e saj
// Çelësi = emri i rrugës, Vlera = komponenti i ikonës nga Lucide
const iconMap = {
  dashboard:           LayoutDashboard,  // Ikona e panelit kryesor
  analyze:             ScanSearch,        // Ikona e analizës
  "url-analyzer":      Globe,             // Ikona e globit për URL
  history:             History,           // Ikona e historikut
  "model-metrics":     BarChart3,         // Ikona e grafikëve
  admin:               LockKeyhole,       // Ikona e kyçit për admin
  "system-diagnostics": ShieldCheck,     // Ikona e mbrojtjes për diagnostikë
  about:               HelpCircle,        // Ikona e pyetjes për info
};

// Versione të animuara të elementeve HTML (framer-motion)
const MotionBackdrop = motion.button;  // Sfond i errët i menysë celular
const MotionSidebar  = motion.div;     // Sidebar me animacion
const MotionContent  = motion.div;     // Zona e përmbajtjes me animacion

// buildInitials - Ndërto inicalet nga emri i plotë
// Shembull: "Djellona Pllana" → "DP"
// Shembull: "admin@test.com" → "AD" (nëse s'ka emër)
function buildInitials(name = "") {
  return name
    .split(/\s+/)           // Ndaj me hapësira
    .filter(Boolean)        // Hiq pjesët bosh
    .map((part) => part[0]) // Merr shkronjën e parë të secilit fjalë
    .join("")               // Bashkoji
    .slice(0, 2)            // Merr vetëm 2 të parat
    .toUpperCase();         // Shndërroi në shkronja të mëdha
}

// NavigationLink - Lidhja e navigimit (çdo buton menu)
// Shfaq ikonën dhe emrin e seksionit. Ndryshon stili kur është aktiv.
function NavigationLink({ item, icon, active, onClick }) {
  const Icon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left transition-all duration-200",
        // Nëse është faqja aktuale: stil i theksuar. Përndryshe: stil normal
        active
          ? "border-[var(--border-emphasis)] bg-[linear-gradient(135deg,rgba(104,213,255,0.16),rgba(123,215,255,0.05))] text-[var(--foreground)] shadow-[0_18px_40px_rgba(42,178,255,0.12)]"
          : "border-transparent bg-transparent text-[var(--muted-foreground)] hover:border-[var(--border-subtle)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]"
      )}
    >
      {/* Kutia e ikonës */}
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
      {/* Titulli dhe përshkrimi i seksionit */}
      <span className="space-y-1">
        <strong className="block text-sm font-semibold">{item.title}</strong>
        <span className="block text-xs leading-5 text-[var(--muted-foreground)]">{item.description}</span>
      </span>
    </button>
  );
}

// Sidebar - Paneli navigues në të majtë
// Shfaq logon, lidhjet e navigimit dhe informacionet e përdoruesit.
// Parametrat:
//   route          - Rruga aktuale (cila faqe është aktive)
//   session        - Informacionet e sesionit (emri, email, roli)
//   visibleRoutes  - Lista e rrugëve të lejuara për këtë përdorues
//   onNavigate     - Funksioni thirret kur klikon një link navigimi
//   onLogout       - Funksioni thirret kur klikon "Log Out"
//   onClose        - Funksioni thirret kur mbyll menynë celular
function Sidebar({ route, session, visibleRoutes, onNavigate, onLogout, onClose }) {
  // Ndërto inicalet e përdoruesit (p.sh. "DP")
  const initials = buildInitials(session.user.name || session.user.email);

  return (
    <aside className="surface-card flex h-full min-h-[calc(100vh-1.5rem)] flex-col gap-6 p-5 lg:min-h-[calc(100vh-2rem)]">
      {/* Kreu i sidebar-it: logo dhe butoni i mbylljes (celular) */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div className="flex items-center gap-3">
          {/* Logo e aplikacionit */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(104,213,255,0.22),rgba(255,255,255,0.08))] text-[var(--foreground)]">
            <Activity className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <strong className="block font-display text-lg font-semibold tracking-[-0.04em]">Verity Lens</strong>
            <span className="block text-xs text-[var(--muted-foreground)]">AI credibility operations platform</span>
          </div>
        </div>

        {/* Butoni X për të mbyllur menynë - shfaqet vetëm në celular */}
        <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label="Close menu">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Zona e navigimit */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Workspace</span>
          {/* Shfaq numrin e seksioneve të disponueshme */}
          <Badge variant="neutral">{visibleRoutes.length} views</Badge>
        </div>

        {/* Lista e lidhjeve të navigimit */}
        <nav className="flex-1 space-y-2 overflow-auto pr-1">
          {visibleRoutes.map((key) => {
            const item = ROUTES[key];               // Merr të dhënat e seksionit
            const Icon = iconMap[key] || LayoutDashboard;  // Merr ikonën

            return (
              <NavigationLink
                key={key}
                item={item}
                icon={Icon}
                active={route === key}  // Aktiv nëse është rruga aktuale
                onClick={() => {
                  onNavigate(key);   // Navigo tek seksioni
                  onClose();         // Mbyll menynë celular nëse është hapur
                }}
              />
            );
          })}
        </nav>
      </div>

      {/* Këndi i poshtëm: informacionet e përdoruesit */}
      <div className="space-y-4 border-t border-[var(--border-subtle)] pt-5">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
          <div className="flex items-center gap-3">
            {/* Avatar me inicalet e përdoruesit */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(104,213,255,0.22),rgba(52,211,153,0.16))] text-sm font-bold text-[var(--foreground)]">
              {initials || "VL"}
            </div>
            <div className="min-w-0 space-y-1">
              {/* Emri i plotë i përdoruesit */}
              <strong className="block truncate text-sm font-semibold text-[var(--foreground)]">{session.user.name}</strong>
              {/* Emaili i përdoruesit */}
              <span className="block truncate text-xs text-[var(--muted-foreground)]">{session.user.email}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            {/* Roli i përdoruesit (p.sh. "admin" ose "user") */}
            <Badge variant="info">{session.user.role}</Badge>
            {/* Butoni i daljes nga sistemi */}
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

// AppShell - Korniza kryesore e aplikacionit
// Komponenti "mbështjellës" që rrethon çdo faqe.
// Parametrat:
//   route      - Emri i rrugës aktuale (p.sh. "dashboard")
//   session    - Të dhënat e sesionit të përdoruesit
//   onNavigate - Funksioni i navigimit midis faqeve
//   onLogout   - Funksioni i daljes nga sistemi
//   children   - Faqja aktuale (ndryshon sipas navigimit)
export function AppShell({ route, session, onNavigate, onLogout, children }) {
  // menuOpen - kontrollon nëse menyja celular është e hapur
  const [menuOpen, setMenuOpen] = useState(false);

  // Merr temën aktuale dhe funksionin e ndryshimit të saj
  const { theme, toggleTheme } = useTheme();

  // Merr të dhënat e rrugës aktuale (titulli, përshkrimi)
  const currentRoute = ROUTES[route] || ROUTES.dashboard;
  const CurrentRouteIcon = iconMap[route] || LayoutDashboard;

  // Filtro rrugët sipas rolit të përdoruesit
  // P.sh.: faqja "admin" shfaqet vetëm për rolin "admin"
  const visibleRoutes = useMemo(
    () =>
      NAVIGATION_ORDER.filter((key) => {
        const item = ROUTES[key];
        // Nëse rruga nuk ka kufizim roli, shfaqe gjithmonë
        return !item.roles?.length || item.roles.includes(session.user.role);
      }),
    [session.user.role]
  );

  return (
    <div className="relative min-h-screen px-3 py-3 lg:px-4 lg:py-4">
      {/* Sfond dekorativ me flluskat e ngjyrës (blur circles) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-[rgba(52,211,153,0.12)] blur-3xl" />   {/* Jeshile - poshtë majtas */}
        <div className="absolute right-[8%] top-0 h-72 w-72 rounded-full bg-[rgba(104,213,255,0.16)] blur-3xl" />    {/* Blu - lart djathtas */}
        <div className="absolute bottom-[18%] right-[-40px] h-56 w-56 rounded-full bg-[rgba(255,194,102,0.12)] blur-3xl" /> {/* Portokalli - djathtas */}
      </div>

      {/* Grid kryesor: sidebar në të majtë + përmbajtja në të djathtë */}
      <div className="relative z-10 grid min-h-[calc(100vh-1.5rem)] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar i desktopit - i fshehur në ekrane të vogla */}
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

        {/* Sidebar celular me animacion - shfaqet vetëm kur menuOpen=true */}
        <AnimatePresence>
          {menuOpen ? (
            <>
              {/* Sfond i errët pas sidebar-it celular */}
              <MotionBackdrop
                type="button"
                aria-label="Close navigation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
              />
              {/* Sidebar celular që rrëshqet nga e majta */}
              <MotionSidebar
                initial={{ x: -24, opacity: 0 }}     {/* Fillon jashtë ekranit majtas */}
                animate={{ x: 0, opacity: 1 }}        {/* Rrëshqet brenda */}
                exit={{ x: -24, opacity: 0 }}         {/* Rrëshqet jashtë */}
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

        {/* Zona kryesore e përmbajtjes (e djathta) */}
        <main className="min-w-0 space-y-4">
          {/* Header i ngjitshëm (mbetet sipër gjatë lëvizjes) */}
          <header className="surface-card sticky top-3 z-30 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between lg:top-4">
            <div className="flex min-w-0 items-start gap-3">
              {/* Butoni hamburger ≡ - vetëm për celular */}
              <Button type="button" variant="outline" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>

              <div className="min-w-0 space-y-3">
                {/* Rreshti i sipërm: etiketat e faqes dhe roli */}
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
                  {/* Titulli kryesor i faqes */}
                  <h1 className="font-display text-[clamp(2rem,3vw,3rem)] font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                    {currentRoute.title}
                  </h1>
                  {/* Përshkrimi i faqes */}
                  <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{currentRoute.description}</p>
                </div>
              </div>
            </div>

            {/* Kontrollat e header-it: tema dhe njoftimet */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Butoni i ndryshimit të temës */}
              <Button type="button" variant="outline" onClick={toggleTheme}>
                {/* Shfaq ikonën e duhur sipas temës aktuale */}
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
              {/* Butoni i ziles me njoftimet */}
              <NotificationCenter />
            </div>
          </header>

          {/* Zona e faqes - animohet çdo herë që ndryshon rruga */}
          <MotionContent
            key={route}                                    {/* key ndryshon → animacion i ri */}
            initial={{ opacity: 0, y: 12 }}               {/* Fillon i zhdukur dhe pak poshtë */}
            animate={{ opacity: 1, y: 0 }}                {/* Shfaqet duke lëvizur lart */}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* children = faqja aktuale (p.sh. Dashboard, Analyzer, etj.) */}
            {children}
          </MotionContent>
        </main>
      </div>
    </div>
  );
}
