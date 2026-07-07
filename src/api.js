const JSON_HEADERS = {
  "Content-Type": "application/json",
};

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

function download(path) {
  const anchor = document.createElement("a");
  anchor.href = path;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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
  downloadHistoryCsv: (params) => download(`/api/history/export.csv${buildQueryString(params)}`),
  downloadHistoryPdf: (params) => download(`/api/history/export.pdf${buildQueryString(params)}`),
  downloadAnalysisPdf: (analysisId) => download(`/api/history/${analysisId}/export.pdf`),
};
