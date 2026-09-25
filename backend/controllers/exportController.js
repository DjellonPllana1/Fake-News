/**
 * ============================================================================
 * KONTROLLORI I EKSPORTIT TË TË DHËNAVE (exportController.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar mundëson shkarkimin e raporteve dhe analizave në formate të ndryshme:
 * - PDF (dokument i gatshëm për t'u printuar ose lexuar si fletë zyrtare)
 * - CSV (tabelë për Microsoft Excel)
 * - JSON (format i të dhënave për programues dhe kompjuterë)
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur përdoruesi klikon "Shkarko Raportin PDF" ose "Eksporto në Excel",
 * ky skedar e gjeneron skedarin përkatës, i vendos emrin me datën e sotme,
 * dhe ia dërgon shfletuesit të përdoruesit për shkarkim të menjëhershëm.
 */

import {
  exportAnalysisCsv,
  exportAnalysisJson,
  exportAnalysisPdf,
  exportHistoryCsv,
  exportHistoryJson,
  exportHistoryPdf,
} from "../services/exportService.js";
import { AppError } from "../utils/appError.js";
import { validateHistoryQuery } from "../utils/validation.js";

/**
 * Funksion ndihmës: Krijon një tekst me datën dhe orën (p.sh. 2026-09-25-14-30-00)
 * që përdoret për t'i vënë emra unikë skedarëve të shkarkuar.
 */
function timestampSlug() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/**
 * 1. SHKARKO HISTORIKUN SI EXCEL (CSV)
 * Merr listën e të gjitha analizave të kaluara dhe i shkarkon si tabelë Excel.
 */
export async function downloadHistoryCsv(req, res) {
  const filters = validateHistoryQuery(req.query);
  const content = await exportHistoryCsv(filters);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="verity-lens-history-${timestampSlug()}.csv"`);
  return res.status(200).send(content);
}

/**
 * 2. SHKARKO HISTORIKUN SI DOKUMENT PDF
 * Krijon një dokument elegant PDF me të gjitha analizat e bëra.
 */
export async function downloadHistoryPdf(req, res) {
  const filters = validateHistoryQuery(req.query);
  const content = await exportHistoryPdf(filters);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="verity-lens-history-${timestampSlug()}.pdf"`);
  return res.status(200).send(content);
}

/**
 * 3. SHKARKO HISTORIKUN SI JSON
 * Eksporton historikun në format digjital JSON për përpunim të mëtejshëm.
 */
export async function downloadHistoryJson(req, res) {
  const filters = validateHistoryQuery(req.query);
  const content = await exportHistoryJson(filters);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="verity-lens-history-${timestampSlug()}.json"`);
  return res.status(200).send(content);
}

/**
 * 4. SHKARKO RAPORTIN E NJË ANALIZE SPECIFIKE NË PDF
 * Kur përdoruesi analizon një lajm të veçantë dhe do raportin e plotë për atë lajm në PDF.
 */
export async function downloadAnalysisPdf(req, res) {
  const content = await exportAnalysisPdf(req.params.analysisId);

  // Nëse nuk gjendet asnjë analizë me këtë numër identifikues, njofton me gabim 404
  if (!content) {
    throw new AppError("Analysis report not found.", 404, "ANALYSIS_REPORT_NOT_FOUND");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="article-analysis-${req.params.analysisId}.pdf"`);
  return res.status(200).send(content);
}

/**
 * 5. SHKARKO RAPORTIN E NJË ANALIZE SPECIFIKE NË CSV (EXCEL)
 */
export async function downloadAnalysisCsv(req, res) {
  const content = await exportAnalysisCsv(req.params.analysisId);

  if (!content) {
    throw new AppError("Analysis report not found.", 404, "ANALYSIS_REPORT_NOT_FOUND");
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="article-analysis-${req.params.analysisId}.csv"`);
  return res.status(200).send(content);
}

/**
 * 6. SHKARKO RAPORTIN E NJË ANALIZE SPECIFIKE NË JSON
 */
export async function downloadAnalysisJson(req, res) {
  const content = await exportAnalysisJson(req.params.analysisId);

  if (!content) {
    throw new AppError("Analysis report not found.", 404, "ANALYSIS_REPORT_NOT_FOUND");
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="article-analysis-${req.params.analysisId}.json"`);
  return res.status(200).send(content);
}
