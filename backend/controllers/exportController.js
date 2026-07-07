import { exportAnalysisPdf, exportHistoryCsv, exportHistoryPdf } from "../services/exportService.js";
import { AppError } from "../utils/appError.js";
import { validateHistoryQuery } from "../utils/validation.js";

function timestampSlug() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export async function downloadHistoryCsv(req, res) {
  const filters = validateHistoryQuery(req.query);
  const content = await exportHistoryCsv(filters);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="verity-lens-history-${timestampSlug()}.csv"`);
  return res.status(200).send(content);
}

export async function downloadHistoryPdf(req, res) {
  const filters = validateHistoryQuery(req.query);
  const content = await exportHistoryPdf(filters);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="verity-lens-history-${timestampSlug()}.pdf"`);
  return res.status(200).send(content);
}

export async function downloadAnalysisPdf(req, res) {
  const content = await exportAnalysisPdf(req.params.analysisId);

  if (!content) {
    throw new AppError("Analysis report not found.", 404, "ANALYSIS_REPORT_NOT_FOUND");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="article-analysis-${req.params.analysisId}.pdf"`);
  return res.status(200).send(content);
}
