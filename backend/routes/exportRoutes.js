/**
 * ============================================================================
 * RRUGËT E EKSPORTIT DHE SHKARKIMIT (exportRoutes.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton adresat ku shkarkohen skedarët PDF, CSV (Excel) dhe JSON.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Këto adresa thirren kur përdoruesi klikon butona të tillë si:
 * - "Shkarko krejt historikun si PDF ose Excel"
 * - "Shkarko raportin e këtij lajmi specifik si PDF"
 */

import { Router } from "express";
import {
  downloadAnalysisCsv,
  downloadAnalysisJson,
  downloadAnalysisPdf,
  downloadHistoryCsv,
  downloadHistoryJson,
  downloadHistoryPdf,
} from "../controllers/exportController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Shkarkimi i krejt historikut të analizave në tre formate të ndryshme:
router.get("/history/export.csv", requireAuth, asyncHandler(downloadHistoryCsv));   // Excel
router.get("/history/export.json", requireAuth, asyncHandler(downloadHistoryJson)); // JSON
router.get("/history/export.pdf", requireAuth, asyncHandler(downloadHistoryPdf));   // Dokument PDF

// Shkarkimi i raportit të një analize të vetme (sipas numrit ID të analizës):
router.get("/history/:analysisId/export.csv", requireAuth, asyncHandler(downloadAnalysisCsv));
router.get("/history/:analysisId/export.json", requireAuth, asyncHandler(downloadAnalysisJson));
router.get("/history/:analysisId/export.pdf", requireAuth, asyncHandler(downloadAnalysisPdf));

export default router;
