import { startTransition, useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ROUTES } from "./constants";
import { AboutPage } from "./pages/AboutPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";
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

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [route, setRoute] = useState(() => (loadSession() ? getRouteFromHash() : "login"));
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    function handleHashChange() {
      const nextRoute = session ? getRouteFromHash() : "login";
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
    page = <ModelMetricsPage refreshToken={refreshToken} onModelsUpdated={triggerRefresh} />;
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
