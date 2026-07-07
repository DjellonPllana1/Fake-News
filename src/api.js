const JSON_HEADERS = {
  "Content-Type": "application/json",
};

const SESSION_STORAGE_KEY = "verity-lens-session";

function getAuthToken() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.token || "" : "";
  } catch {
    return "";
  }
}

function buildAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {
      ...JSON_HEADERS,
      ...buildAuthHeaders(),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let payload = {};

  try {
    payload = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message || payload.message || "Request failed.");
  }

  return payload.data;
}

function readDownloadFilename(response, fallback = "download.bin") {
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

async function download(path, fallbackFilename = "download.bin") {
  const response = await fetch(path, {
    method: "GET",
    headers: {
      ...buildAuthHeaders(),
    },
  });

  if (!response.ok) {
    try {
      const payload = await response.json();
      throw new Error(payload.error?.message || payload.message || "Download failed.");
    } catch (error) {
      throw new Error(error.message || "Download failed.");
    }
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = readDownloadFilename(response, fallbackFilename);
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export const api = {
  login: (body) => request("/api/login", { method: "POST", body }),
  getDashboard: () => request("/api/dashboard"),
  analyzeArticle: (body) => request("/api/analyze", { method: "POST", body }),
  fetchUrl: (body) => request("/api/fetch-url", { method: "POST", body }),
  getHistory: (params) => request(`/api/history${buildQueryString(params)}`),
  getDatasetArticles: (params) => request(`/api/articles${buildQueryString(params)}`),
  getModelMetrics: () => request("/api/model-metrics"),
  retrainModels: () => request("/api/model/retrain", { method: "POST" }),
  getHealth: () => request("/api/health"),
  getSystemDiagnostics: () => request("/api/system-diagnostics"),
  getAdminDashboard: () => request("/api/admin/dashboard"),
  getAdminUsers: () => request("/api/admin/users"),
  updateAdminUser: (email, body) => request(`/api/admin/users/${encodeURIComponent(email)}`, { method: "PATCH", body }),
  getAdminDatasets: (params) => request(`/api/admin/datasets${buildQueryString(params)}`),
  deleteAdminDataset: (articleId) => request(`/api/admin/datasets/${encodeURIComponent(articleId)}`, { method: "DELETE" }),
  downloadAdminDatasetsCsv: (params) => download(`/api/admin/datasets/download.csv${buildQueryString(params)}`, "verity-lens-datasets.csv"),
  getAdminAnalyses: (params) => request(`/api/admin/analyses${buildQueryString(params)}`),
  deleteAdminAnalysis: (analysisId) => request(`/api/admin/analyses/${encodeURIComponent(analysisId)}`, { method: "DELETE" }),
  getAdminModels: () => request("/api/admin/models"),
  retrainAdminModels: () => request("/api/admin/models/retrain", { method: "POST" }),
  getAdminApiLogs: (params) => request(`/api/admin/api-logs${buildQueryString(params)}`),
  getAdminDiagnostics: () => request("/api/admin/diagnostics"),
  getAdminConfiguration: () => request("/api/admin/configuration"),
  updateAdminConfiguration: (body) => request("/api/admin/configuration", { method: "PATCH", body }),
  downloadHistoryCsv: (params) => download(`/api/history/export.csv${buildQueryString(params)}`, "verity-lens-history.csv"),
  downloadHistoryPdf: (params) => download(`/api/history/export.pdf${buildQueryString(params)}`, "verity-lens-history.pdf"),
  downloadAnalysisPdf: (analysisId) => download(`/api/history/${analysisId}/export.pdf`, `article-analysis-${analysisId}.pdf`),
};
