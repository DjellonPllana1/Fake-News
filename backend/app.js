/**
 * ============================================================================
 * KONFIGURIMI I APLIKACIONIT EXPRESS (app.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar ndërton dhe bashkon të gjitha pjesët e serverit:
 * - Sigurinë (CORS - kush lejohet të komunikojë me serverin)
 * - Leximin e të dhënave që dërgon përdoruesi (JSON parser)
 * - Regjistrimin e kërkesave (Logger)
 * - Rrugët kryesore (Routes) ku mund të shkojnë kërkesat
 * - Trajtimin e gabimeve (nëse diçka shkon keq, të mos rrëzohet krejt faqja)
 */

import cors from "cors";
import express from "express";
import { requestLogger } from "./middleware/requestLogger.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Krijojmë aplikacionin qendror Express
const app = express();

// Konfigurimi i CORS (Cross-Origin Resource Sharing):
// Përcakton se cilat faqe interneti lejohen të flasin me këtë server (p.sh. faqja jonë React).
const configuredOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const corsOptions =
  configuredOrigins.length && !configuredOrigins.includes("*")
    ? {
        origin: configuredOrigins,
        credentials: true,
      }
    : undefined;

// Cilësime sigurie për serverin
app.set("trust proxy", 1);
app.disable("x-powered-by"); // Fsheh nga hakerat faktin që po përdorim Express

// Aktivizojmë rregullat e sigurisë CORS
app.use(cors(corsOptions));

// Mundëson leximin e të dhënave në format tekst/JSON (deri në 2 megabajt për kërkesë)
app.use(express.json({ limit: "2mb" }));

// Regjistron çdo kërkesë që vjen te serveri për ta parë në terminal
app.use(requestLogger);

// Të gjitha rrugët e API-së nisin me prefiksin "/api" (p.sh. /api/analyze, /api/auth/login)
app.use("/api", routes);

// Nëse dikush kërkon një faqe apo link që nuk ekziston, ky funksion jep gabim 404 (Not Found)
app.use(notFoundHandler);

// Nëse ndodh ndonjë gabim gjatë ekzekutimit, ky funksion e kap dhe ia kthen përdoruesit bukur
app.use(errorHandler);

export default app;
