import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const generatedWatchIgnorePatterns = [
  "**/backend/database.json",
  "**/backend/data/app-config.json",
  "**/backend/models/**",
  "**/ml/models/**",
  "**/ml/metrics/**",
  "**/ml/datasets/processed/**",
  "**/dist/**",
  "**/.tmp/**",
  "**/.tmp-*.log",
];

// https://vite.dev/config/
export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: fileURLToPath(new URL("index.html", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
    // Persisted analysis/model artifacts live inside the repo, so ignore them
    // during frontend dev to prevent full-page reloads after successful API calls.
    watch: {
      ignored: generatedWatchIgnorePatterns,
    },
  },
});
