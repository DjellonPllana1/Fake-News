/**
 * ============================================================================
 * KLIENTI I KOMUNIKIMIT ME SERVERIN (api.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar shërben si "telefoni" ose "ura lidhëse" midis pamjes në ekran (Frontend)
 * dhe serverit në prapaskenë (Backend).
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur përdoruesi klikon një buton në faqe (p.sh. "Analizo Lajmin"):
 * 1. Faqja thërret funksionin përkatës nga ky skedar (p.sh. api.analyzeArticle).
 * 2. Ky skedar merr automatikisht çelësin e sigurisë (Token) nga kujtesa e browser-it.
 * 3. Ia dërgon kërkesën serverit në internet me anë të funksionit `fetch`.
 * 4. Kur serveri përgjigjet me sukses, ky skedar ia kthen të dhënat faqes për t'u shfaqur bukur.
 * 5. Nëse përdoruesi do të shkarkojë një skedar (PDF ose CSV), funksioni `download`
 *    krijon automatikisht shkarkimin në kompjuter.
 */

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

const SESSION_STORAGE_KEY = "verity-lens-session";

/**
 * Gjen çelësin digjital (Token) të përdoruesit të kyçur nga kujtesa e shfletuesit.
 */
function getAuthToken() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.token || "" : "";
  } catch {
    return "";
  }
}

/**
 * Përgatit kokën e kërkesës me çelësin e sigurisë (Bearer <token>).
 */
function buildAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Krijon pjesën e filtrimit në fund të linkut (p.sh. ?search=kosova&limit=25).
 */
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

/**
 * Funksioni qendror për dërgimin e kërkesave (GET, POST, PATCH, DELETE).
 */
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
    throw new Error("Serveri ktheu një përgjigje të palexueshme.");
  }

  // Nëse kërkesa dështoi, njofton me mesazhin e gabimit
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message || payload.message || "Kërkesa dështoi.");
  }

  return payload.data;
}

/**
 * Gjen emrin e skedarit nga përgjigja e serverit për shkarkim.
 */
function readDownloadFilename(response, fallback = "download.bin") {
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

/**
 * Funksion ndihmës: Shkarkon skedarë (PDF, CSV, JSON) direkt në kompjuterin e përdoruesit.
 */
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
      throw new Error(payload.error?.message || payload.message || "Shkarkimi dështoi.");
    } catch (error) {
      throw new Error(error.message || "Shkarkimi dështoi.");
    }
  }

  // Krijon një lidhje të përkohshme në memorie dhe simulon klikimin e shkarkimit
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

/**
 * LISTA E TË GJITHA VEPRIMEVE TË MUNDSHME NË SISTEM (Objekti `api`)
 */
export const api = {
  // Autentikimi
  login: (body) => request("/api/login", { method: "POST", body }),

  // Paneli kryesor dhe analiza e lajmeve
  getDashboard: () => request("/api/dashboard"),
  analyzeArticle: (body) => request("/api/analyze", { method: "POST", body }),
  fetchUrl: (body) => request("/api/fetch-url", { method: "POST", body }),
  getHistory: (params) => request(`/api/history${buildQueryString(params)}`),
  getDatasetArticles: (params) => request(`/api/articles${buildQueryString(params)}`),

  // Inteligjenca Artificiale dhe shëndeti i sistemit
  getModelMetrics: () => request("/api/model-metrics"),
  retrainModels: () => request("/api/model/retrain", { method: "POST" }),
  getHealth: () => request("/api/health"),
  getSystemDiagnostics: () => request("/api/system-diagnostics"),

  // Zona administrative (vetëm për Admin)
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

  // Shkarkimi i raporteve në format PDF, Excel dhe JSON
  downloadHistoryCsv: (params) => download(`/api/history/export.csv${buildQueryString(params)}`, "verity-lens-history.csv"),
  downloadHistoryJson: (params) => download(`/api/history/export.json${buildQueryString(params)}`, "verity-lens-history.json"),
  downloadHistoryPdf: (params) => download(`/api/history/export.pdf${buildQueryString(params)}`, "verity-lens-history.pdf"),
  downloadAnalysisCsv: (analysisId) => download(`/api/history/${analysisId}/export.csv`, `article-analysis-${analysisId}.csv`),
  downloadAnalysisJson: (analysisId) => download(`/api/history/${analysisId}/export.json`, `article-analysis-${analysisId}.json`),
  downloadAnalysisPdf: (analysisId) => download(`/api/history/${analysisId}/export.pdf`, `article-analysis-${analysisId}.pdf`),
};
