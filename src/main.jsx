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
