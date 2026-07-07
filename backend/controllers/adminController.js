import {
  deleteAdminAnalysis,
  deleteAdminDatasetArticle,
  downloadAdminDatasetCsv,
  getAdminAnalyses,
  getAdminApiLogs,
  getAdminConfiguration,
  getAdminDashboard,
  getAdminDatasets,
  getAdminDiagnostics,
  getAdminModels,
  getAdminUsers,
  retrainAdminModels,
  updateAdminConfigurationValues,
  updateAdminUser,
} from "../services/adminService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { validateArticlesQuery, validateHistoryQuery } from "../utils/validation.js";

function timestampSlug() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export async function adminDashboard(req, res) {
  const data = await getAdminDashboard({
    datasetLimit: req.query.datasetLimit,
    analysisLimit: req.query.analysisLimit,
  });
  return sendSuccess(res, {
    data,
    message: "Admin dashboard loaded successfully.",
  });
}

export async function adminUsers(req, res) {
  const data = await getAdminUsers();
  return sendSuccess(res, {
    data,
    message: "Users loaded successfully.",
  });
}

export async function adminUpdateUser(req, res) {
  const data = await updateAdminUser({
    actorEmail: req.user.email,
    email: req.params.email,
    updates: req.body || {},
  });
  return sendSuccess(res, {
    data,
    message: "User updated successfully.",
  });
}

export async function adminDatasets(req, res) {
  const filters = validateArticlesQuery(req.query);
  const data = await getAdminDatasets(filters);
  return sendSuccess(res, {
    data,
    message: "Dataset articles loaded successfully.",
  });
}

export async function adminDeleteDataset(req, res) {
  const data = await deleteAdminDatasetArticle(req.params.articleId);
  return sendSuccess(res, {
    data,
    message: "Dataset article deleted successfully.",
  });
}

export async function adminDownloadDatasets(req, res) {
  const filters = validateArticlesQuery(req.query);
  filters.limit = 5000;
  const content = await downloadAdminDatasetCsv(filters);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="verity-lens-datasets-${timestampSlug()}.csv"`);
  return res.status(200).send(content);
}

export async function adminAnalyses(req, res) {
  const filters = validateHistoryQuery(req.query);
  const data = await getAdminAnalyses(filters);
  return sendSuccess(res, {
    data,
    message: "Admin analysis history loaded successfully.",
  });
}

export async function adminDeleteAnalysis(req, res) {
  const data = await deleteAdminAnalysis(req.params.analysisId);
  return sendSuccess(res, {
    data,
    message: "Analysis deleted successfully.",
  });
}

export async function adminModels(req, res) {
  const data = await getAdminModels();
  return sendSuccess(res, {
    data,
    message: "Admin model view loaded successfully.",
  });
}

export async function adminRetrainModels(req, res) {
  const data = await retrainAdminModels();
  return sendSuccess(res, {
    data,
    message: "Models retrained successfully.",
  });
}

export async function adminApiLogs(req, res) {
  const data = await getAdminApiLogs(req.query.limit);
  return sendSuccess(res, {
    data,
    message: "API logs loaded successfully.",
  });
}

export async function adminDiagnostics(req, res) {
  const data = await getAdminDiagnostics();
  return sendSuccess(res, {
    data,
    message: "Admin diagnostics loaded successfully.",
  });
}

export async function adminConfiguration(req, res) {
  const data = await getAdminConfiguration();
  return sendSuccess(res, {
    data,
    message: "Application configuration loaded successfully.",
  });
}

export async function adminUpdateConfiguration(req, res) {
  const data = await updateAdminConfigurationValues(req.body || {});
  return sendSuccess(res, {
    data,
    message: "Application configuration updated successfully.",
  });
}
