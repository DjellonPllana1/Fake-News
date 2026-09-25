/**
 * ============================================================================
 * KOMPONENTI KRYESOR I NAVIGIMIT DHE FAQEVE (App.jsx)
 * ============================================================================
 * Qëllimi:
 * Ky skedar është "zemra" e ndërfaqes së përdoruesit (Frontend).
 * Ai kontrollon se cila faqe shfaqet në ekran në varësi të asaj që klikon përdoruesi.
 * 
 * Si funksionon me fjalë të thjeshta:
 * 1. KONTROLLI I HYRJES: Nëse përdoruesi nuk është i kyçur, shfaqet faqja e hyrjes (<LoginPage />).
 * 2. KONTROLLI I ROLEVE: Nëse një përdorues i thjeshtë përpiqet të hapë faqen e Adminit,
 *    sistemi nuk e lejon dhe e kthen te Paneli Kryesor (<DashboardPage />).
 * 3. NDËRRIMI I FAQEVE (Routing): Kur klikohet një buton në meny:
 *    - "dashboard" -> Shfaq statistikat e përgjithshme
 *    - "analyze" -> Shfaq formën për të shkruar dhe analizuar një lajm
 *    - "url-analyzer" -> Shfaq faqen për të analizuar lajmin me link (URL)
 *    - "history" -> Shfaq historikun e të gjitha analizave
 *    - "model-metrics" -> Shfaq saktësinë e Inteligjencës Artificiale
 *    - "admin" -> Shfaq panelin e kontrollit të administratorit
 *    - "system-diagnostics" -> Shfaq gjendjen e serverit
 *    - "about" -> Shfaq informacion mbi projektin Verity Lens
 */

import { startTransition, useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ROUTES } from "./constants";
import { AboutPage } from "./pages/AboutPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { ModelMetricsPage } from "./pages/ModelMetricsPage";
import { SystemDiagnosticsPage } from "./pages/SystemDiagnosticsPage";
import { UrlAnalyzerPage } from "./pages/UrlAnalyzerPage";

// Çelësi ku ruhet sesioni i përdoruesit në shfletues (LocalStorage)
const SESSION_STORAGE_KEY = "verity-lens-session";

/**
 * Gjen emrin e faqes nga adresa në browser (p.sh. #/analyze -> "analyze").
 */
function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "") || "dashboard";
  return ROUTES[hash] ? hash : "dashboard";
}

/**
 * Lexon të dhënat e përdoruesit të ruajtura në kujtesën e browser-it.
 */
function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Kontrollon nëse ky person ka leje ta hapë këtë faqe (p.sh. a është Admin).
 */
function canAccessRoute(route, session) {
  const routeMeta = ROUTES[route] || ROUTES.dashboard;
  return !routeMeta.roles?.length || routeMeta.roles.includes(session?.user?.role);
}

export default function App() {
  // Ruan të dhënat e personit që është futur (ose null nëse s'është kyçur ende)
  const [session, setSession] = useState(() => loadSession());
  
  // Ruan faqen që po shfaqet aktualisht në ekran
  const [route, setRoute] = useState(() => {
    const currentSession = loadSession();
    const initialRoute = currentSession ? getRouteFromHash() : "login";
    return currentSession && !canAccessRoute(initialRoute, currentSession) ? "dashboard" : initialRoute;
  });
  
  // Numërues që ndihmon rifreskimin e faqeve kur ruhet një analizë e re
  const [refreshToken, setRefreshToken] = useState(0);

  // Dëgjon ndryshimet e linkut kur përdoruesi klikon butona ose shigjetat e shfletuesit
  useEffect(() => {
    function handleHashChange() {
      const candidateRoute = session ? getRouteFromHash() : "login";
      const nextRoute = session && !canAccessRoute(candidateRoute, session) ? "dashboard" : candidateRoute;
      startTransition(() => {
        setRoute(nextRoute);
      });
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [session]);

  // Nëse përdoruesi nuk është i kyçur, e ridrejton automatikisht te faqja e Login-it
  useEffect(() => {
    if (!session) {
      window.location.hash = "/login";
      return;
    }

    if (!window.location.hash || window.location.hash === "#/login") {
      window.location.hash = "/dashboard";
    }
  }, [session]);

  // Veprimi kur përdoruesi plotëson të dhënat dhe kyçet me sukses
  function handleLogin(data) {
    const nextSession = {
      user: data.user,
      token: data.token,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    window.location.hash = "/dashboard";
  }

  // Veprimi kur përdoruesi klikon "Dil" (Logout)
  function handleLogout() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setRoute("login");
    window.location.hash = "/login";
  }

  // Veprimi për të ndërruar faqe me klikim të thjeshtë
  function handleNavigate(nextRoute) {
    if (!canAccessRoute(nextRoute, session)) {
      nextRoute = "dashboard";
    }

    startTransition(() => {
      setRoute(nextRoute);
    });
    window.location.hash = `/${nextRoute}`;
  }

  // Nxit rifreskimin e të dhënave
  function triggerRefresh() {
    setRefreshToken((current) => current + 1);
  }

  // Nëse nuk është i kyçur, shfaq vetëm formularin e hyrjes
  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Zgjedh faqen e duhur për t'u shfaqur sipas `route`
  let page = <DashboardPage refreshToken={refreshToken} />;

  if (route === "analyze") {
    page = <AnalyzePage onAnalysisSaved={triggerRefresh} />;
  } else if (route === "url-analyzer") {
    page = <UrlAnalyzerPage onAnalysisSaved={triggerRefresh} />;
  } else if (route === "history") {
    page = <HistoryPage refreshToken={refreshToken} />;
  } else if (route === "model-metrics") {
    page = <ModelMetricsPage refreshToken={refreshToken} onModelsUpdated={triggerRefresh} session={session} />;
  } else if (route === "admin") {
    page = <AdminDashboardPage />;
  } else if (route === "system-diagnostics") {
    page = <SystemDiagnosticsPage />;
  } else if (route === "about") {
    page = <AboutPage />;
  }

  // Korniza e përgjithshme (AppShell) me menynë lart dhe anash, dhe brenda saj faqja e zgjedhur
  return (
    <AppShell route={route} session={session} onNavigate={handleNavigate} onLogout={handleLogout}>
      {page}
    </AppShell>
  );
}
