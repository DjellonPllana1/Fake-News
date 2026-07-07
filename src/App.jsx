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

const SESSION_STORAGE_KEY = "verity-lens-session";

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "") || "dashboard";
  return ROUTES[hash] ? hash : "dashboard";
}

function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function canAccessRoute(route, session) {
  const routeMeta = ROUTES[route] || ROUTES.dashboard;
  return !routeMeta.roles?.length || routeMeta.roles.includes(session?.user?.role);
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [route, setRoute] = useState(() => {
    const currentSession = loadSession();
    const initialRoute = currentSession ? getRouteFromHash() : "login";
    return currentSession && !canAccessRoute(initialRoute, currentSession) ? "dashboard" : initialRoute;
  });
  const [refreshToken, setRefreshToken] = useState(0);

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

  useEffect(() => {
    if (!session) {
      window.location.hash = "/login";
      return;
    }

    if (!window.location.hash || window.location.hash === "#/login") {
      window.location.hash = "/dashboard";
    }
  }, [session]);

  function handleLogin(data) {
    const nextSession = {
      user: data.user,
      token: data.token,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    window.location.hash = "/dashboard";
  }

  function handleLogout() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setRoute("login");
    window.location.hash = "/login";
  }

  function handleNavigate(nextRoute) {
    if (!canAccessRoute(nextRoute, session)) {
      nextRoute = "dashboard";
    }

    startTransition(() => {
      setRoute(nextRoute);
    });
    window.location.hash = `/${nextRoute}`;
  }

  function triggerRefresh() {
    setRefreshToken((current) => current + 1);
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

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

  return (
    <AppShell route={route} session={session} onNavigate={handleNavigate} onLogout={handleLogout}>
      {page}
    </AppShell>
  );
}
