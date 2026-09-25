/* eslint-disable react-refresh/only-export-components */
// ============================================================
// ThemeProvider.jsx - Menaxhimi i Temës (E zezë / E bardhë)
// ============================================================
// Ky skedar kontrollon nëse aplikacioni shfaqet me temë
// të errët (dark mode) apo të çelur (light mode).
// Zgjedhja ruhet automatikisht në memorien e shfletuesit
// (localStorage) kështu që mbetet e njëjtë kur rihapet faqja.
// ============================================================

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Çelësi me të cilin ruhet tema në localStorage të shfletuesit
const THEME_STORAGE_KEY = "verity-lens-theme";

// Krijo një "Context" - është si një variabël global për React.
// Çdo komponent fëmijë mund ta lexojë vlerën e temës prej tij.
const ThemeContext = createContext(null);

// loadStoredTheme - Lexo temën e ruajtur nga shfletuesi
// Nëse nuk ka asnjë të ruajtur, ktheje "dark" si parazgjedhje.
function loadStoredTheme() {
  try {
    // Provo të lexosh temën e ruajtur
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    // Prano vetëm "light" ose "dark"; çdo gjë tjetër → "dark"
    return stored === "light" || stored === "dark" ? stored : "dark";
  } catch {
    // Nëse localStorage nuk funksionon (p.sh. mode private), kthe "dark"
    return "dark";
  }
}

// ThemeProvider - Mbështjellësi kryesor i temës
// Duhet të rrethohet rreth gjithë aplikacionit (shiko main.jsx / App.jsx).
// "children" janë të gjitha komponentet brenda tij.
export function ThemeProvider({ children }) {
  // "theme" ruan vlerën aktuale: "dark" ose "light"
  // Nis me temën e lexuar nga localStorage
  const [theme, setTheme] = useState(loadStoredTheme);

  // useEffect - ekzekutohet çdo herë që "theme" ndryshon
  useEffect(() => {
    // Aplikoi temën në elementin kryesor HTML të faqes
    document.documentElement.dataset.theme = theme;
    // Shto / hiq klasën CSS "dark" sipas nevojës
    document.documentElement.classList.toggle("dark", theme === "dark");
    // Trego shfletuesit se cila ngjyrë skemë duhet të përdorë (për scrollbar etj.)
    document.documentElement.style.colorScheme = theme;

    try {
      // Ruaj temën në localStorage që të mbahet edhe pas rifreskimit
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore theme persistence failures.
      // Nëse ruajtja dështon, thjesht vazhdo - nuk është kritike
    }
  }, [theme]);

  // Përgatit objektin me vlera që do t'u jepen komponenteve fëmijë
  // useMemo - optimizim: krijo objektin vetëm kur "theme" ndryshon
  const value = useMemo(
    () => ({
      theme,       // Tema aktuale: "dark" ose "light"
      setTheme,    // Funksion për të vendosur temën direkt
      // toggleTheme - kaloje mes "dark" dhe "light" me një klikim
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  // Shpjego temën të gjitha komponenteve fëmijë përmes Context-it
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// useTheme - Kârpeza (hook) për të marrë temën aktuale nga çdo komponent
// Shembull përdorimi: const { theme, toggleTheme } = useTheme();
export function useTheme() {
  const value = useContext(ThemeContext);

  // Nëse useTheme thirret jashtë ThemeProvider, hidh gabim
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return value;
}
