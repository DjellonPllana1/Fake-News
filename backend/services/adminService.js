import { deleteAnalysisById, deleteArticleById, readDatabase, toAnalysisRow, updateUserByEmail } from "../database.js";
import { AppError } from "../utils/appError.js";
import { buildCsv } from "../utils/csv.js";
import { buildExtractiveSummary } from "../utils/text.js";
import { getAnalysisHistory, getDatasetArticles } from "./analysisService.js";
import { getApiLogs } from "./apiLogService.js";
import { getAppConfiguration, updateAppConfiguration } from "./appConfigService.js";
import { getSystemDiagnostics } from "./diagnosticsService.js";
import { getModelMetrics, retrainModels } from "./modelService.js";

const ALLOWED_ROLES = new Set(["Admin", "Analyst", "User"]);
const ALLOWED_STATUSES = new Set(["Active", "Inactive"]);

function sanitizeUser(user = {}) {
  return {
    name: user.name || "Unknown User",
    email: user.email || "",
    role: user.role || "User",
    status: user.status || "Active",
  };
}

function buildOverview({ database, diagnostics, modelMetrics, apiLogs }) {
  const users = database.users.map(sanitizeUser);
  const activeUsers = users.filter((user) => user.status === "Active");
  const adminUsers = users.filter((user) => user.role === "Admin");
  const analystUsers = users.filter((user) => user.role === "Analyst");

  return {
    totalUsers: users.length,
    activeUsers: activeUsers.length,
    adminUsers: adminUsers.length,
    analystUsers: analystUsers.length,
    datasetArticles: database.articles.length,
    savedAnalyses: database.analyses.length,
    apiLogEntries: apiLogs.length,
    bestModel: modelMetrics.best_model?.name || diagnostics.model?.bestModel || "Unavailable",
    modelVersion: modelMetrics.model_version || diagnostics.model?.version || "Unavailable",
    modelStatus: diagnostics.model?.status || modelMetrics.status || "unknown",
    lastAnalysisAt: database.meta?.lastAnalysisAt || null,
  };
}

function buildDatasetPreview(articles = [], limit = 12) {
  return articles.slice(0, limit).map((article) => ({
    ...article,
    preview: article.preview || article.text?.slice(0, 180) || "",
    summary: article.summary || buildExtractiveSummary({ headline: article.title, text: article.text }),
  }));
}

function buildModelVersions(modelMetrics = {}) {
  return (modelMetrics.models || []).map((model) => ({
    id: model.id,
    name: model.name,
    version: model.version || modelMetrics.model_version || "Unavailable",
    accuracy: model.accuracy,
    precision: model.precision,
    recall: model.recall,
    f1: model.f1,
    status: model.id === modelMetrics.best_model?.id ? "Production" : "Candidate",
  }));
}

export async function getAdminDashboard({ datasetLimit, analysisLimit } = {}) {
  const [database, diagnostics, modelMetrics, appConfig] = await Promise.all([
    readDatabase(),
    getSystemDiagnostics(),
    getModelMetrics(),
    getAppConfiguration(),
  ]);
  const analyses = database.analyses.map(toAnalysisRow);
  const users = database.users.map(sanitizeUser);
  const [apiLogs, totalApiLogs] = await Promise.all([getApiLogs(appConfig.apiLogViewLimit), getApiLogs(250)]);
  const limit = Number(analysisLimit || appConfig.adminPageSize || 25);
  const datasetViewLimit = Number(datasetLimit || appConfig.adminPageSize || 25);

  return {
    updatedAt: new Date().toISOString(),
    overview: buildOverview({ database, diagnostics, modelMetrics, apiLogs: totalApiLogs }),
    users,
    datasets: {
      summary: {
        total: database.articles.length,
        real: database.articles.filter((item) => item.label === "REAL").length,
        fake: database.articles.filter((item) => item.label === "FAKE").length,
      },
      items: buildDatasetPreview(database.articles, datasetViewLimit),
    },
    analyses: {
      total: analyses.length,
      items: analyses.slice(0, limit),
    },
    models: {
      status: modelMetrics.status || "trained",
      bestModel: modelMetrics.best_model || null,
      modelVersion: modelMetrics.model_version || null,
      generatedAt: modelMetrics.generated_at || null,
      versions: buildModelVersions(modelMetrics),
      preprocessing: modelMetrics.preprocessing || {},
      decisionPolicy: modelMetrics.decision_policy || {},
    },
    apiLogs,
    diagnostics,
    configuration: {
      editable: appConfig,
      runtime: diagnostics.configuration,
    },
  };
}

export async function getAdminUsers() {
  const database = await readDatabase();
  return {
    users: database.users.map(sanitizeUser),
  };
}

export async function updateAdminUser({ actorEmail, email, updates = {} }) {
  const appConfig = await getAppConfiguration();

  if (!appConfig.allowUserRoleEditing) {
    throw new AppError("User role editing is disabled in application configuration.", 403, "USER_ROLE_EDITING_DISABLED");
  }

  const database = await readDatabase();
  const users = database.users.map(sanitizeUser);
  const target = users.find((user) => user.email.toLowerCase() === String(email || "").trim().toLowerCase());

  if (!target) {
    throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  }

  if (String(actorEmail || "").trim().toLowerCase() === target.email.toLowerCase() && (updates.role || updates.status)) {
    throw new AppError("You cannot change your own role or status from the admin dashboard.", 400, "SELF_UPDATE_FORBIDDEN");
  }

  if (updates.role && !ALLOWED_ROLES.has(String(updates.role))) {
    throw new AppError("Invalid user role.", 400, "INVALID_USER_ROLE");
  }

  if (updates.status && !ALLOWED_STATUSES.has(String(updates.status))) {
    throw new AppError("Invalid user status.", 400, "INVALID_USER_STATUS");
  }

  const activeAdmins = users.filter((user) => user.role === "Admin" && user.status === "Active");
  const nextRole = updates.role || target.role;
  const nextStatus = updates.status || target.status;

  if (target.role === "Admin" && target.status === "Active" && activeAdmins.length <= 1 && (nextRole !== "Admin" || nextStatus !== "Active")) {
    throw new AppError("At least one active admin account must remain available.", 400, "LAST_ADMIN_PROTECTED");
  }

  const updated = await updateUserByEmail(target.email, updates);

  if (!updated) {
    throw new AppError("User could not be updated.", 500, "USER_UPDATE_FAILED");
  }

  return {
    user: sanitizeUser(updated),
  };
}

export async function getAdminDatasets(filters = {}) {
  const appConfig = await getAppConfiguration();
  const data = await getDatasetArticles({
    ...filters,
    limit: Number(filters.limit || appConfig.adminPageSize || 25),
  });

  return {
    total: data.total,
    items: buildDatasetPreview(data.articles, data.articles.length),
  };
}

export async function deleteAdminDatasetArticle(articleId) {
  const appConfig = await getAppConfiguration();

  if (!appConfig.allowDatasetDeletion) {
    throw new AppError("Dataset deletion is disabled in application configuration.", 403, "DATASET_DELETION_DISABLED");
  }

  const deleted = await deleteArticleById(articleId);

  if (!deleted) {
    throw new AppError("Dataset article not found.", 404, "DATASET_ARTICLE_NOT_FOUND");
  }

  return {
    deleted: true,
  };
}

export async function downloadAdminDatasetCsv(filters = {}) {
  const data = await getAdminDatasets({
    ...filters,
    limit: Number(filters.limit || 5000),
  });

  return buildCsv(data.items, [
    { header: "ID", value: "id" },
    { header: "Label", value: "label" },
    { header: "Title", value: "title" },
    { header: "Subject", value: "subject" },
    { header: "Source", value: "source" },
    { header: "Date", value: "date" },
    { header: "Summary", value: "summary" },
    { header: "Preview", value: "preview" },
  ]);
}

export async function getAdminAnalyses(filters = {}) {
  const appConfig = await getAppConfiguration();
  const data = await getAnalysisHistory({
    ...filters,
    limit: Number(filters.limit || appConfig.historyPageSize || 100),
  });

  return data;
}

export async function deleteAdminAnalysis(analysisId) {
  const appConfig = await getAppConfiguration();

  if (!appConfig.allowAnalysisDeletion) {
    throw new AppError("Analysis deletion is disabled in application configuration.", 403, "ANALYSIS_DELETION_DISABLED");
  }

  const deleted = await deleteAnalysisById(analysisId);

  if (!deleted) {
    throw new AppError("Analysis not found.", 404, "ANALYSIS_NOT_FOUND");
  }

  return {
    deleted: true,
  };
}

export async function getAdminModels() {
  const [modelMetrics, diagnostics] = await Promise.all([getModelMetrics(), getSystemDiagnostics()]);

  return {
    status: modelMetrics.status || "trained",
    bestModel: modelMetrics.best_model || null,
    modelVersion: modelMetrics.model_version || null,
    generatedAt: modelMetrics.generated_at || null,
    versions: buildModelVersions(modelMetrics),
    preprocessing: modelMetrics.preprocessing || {},
    decisionPolicy: modelMetrics.decision_policy || {},
    diagnostics: diagnostics.model,
  };
}

export async function retrainAdminModels() {
  const appConfig = await getAppConfiguration();

  if (!appConfig.allowModelRetrain) {
    throw new AppError("Model retraining is disabled in application configuration.", 403, "MODEL_RETRAIN_DISABLED");
  }

  return retrainModels();
}

export async function getAdminApiLogs(limit) {
  const appConfig = await getAppConfiguration();
  const [totalLogs, items] = await Promise.all([getApiLogs(250), getApiLogs(limit || appConfig.apiLogViewLimit)]);

  return {
    total: totalLogs.length,
    items,
  };
}

export async function getAdminDiagnostics() {
  return getSystemDiagnostics();
}

export async function getAdminConfiguration() {
  const [appConfig, diagnostics] = await Promise.all([getAppConfiguration(), getSystemDiagnostics()]);

  return {
    editable: appConfig,
    runtime: diagnostics.configuration,
  };
}

export async function updateAdminConfigurationValues(patch = {}) {
  const editable = await updateAppConfiguration(patch);
  const diagnostics = await getSystemDiagnostics();

  return {
    editable,
    runtime: diagnostics.configuration,
  };
}
