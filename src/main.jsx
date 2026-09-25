/**
 * ============================================================================
 * PIKA KRYESORE E NISJES SË FAQES REACT (main.jsx)
 * ============================================================================
 * Qëllimi:
 * Ky skedar është hapi i parë që ekzekutohet kur hapim faqen në shfletues (Browser).
 * 
 * Si funksionon me fjalë të thjeshta:
 * 1. Gjen elementin me id "root" në skedarin kryesor HTML.
 * 2. Ngarkon pamjen (Theme: Dritë/Errësirë) dhe njoftimet (Notifications).
 * 3. Shfaq aplikacionin e plotë React (<App />) në ekranin e përdoruesit.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { NotificationsProvider } from "./components/Notifications";
import { ThemeProvider } from "./components/ThemeProvider";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </ThemeProvider>
  </StrictMode>
);
