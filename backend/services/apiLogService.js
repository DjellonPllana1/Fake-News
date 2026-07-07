const MAX_API_LOGS = 250;
const apiLogs = [];

export function recordApiLog(entry = {}) {
  apiLogs.unshift({
    id: `${Date.now()}-${Math.round(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    method: entry.method || "GET",
    path: entry.path || "/",
    statusCode: Number(entry.statusCode || 0) || 0,
    durationMs: Number(entry.durationMs || 0) || 0,
    userEmail: entry.userEmail || "Anonymous",
    userRole: entry.userRole || "Anonymous",
    ip: entry.ip || "",
  });

  if (apiLogs.length > MAX_API_LOGS) {
    apiLogs.length = MAX_API_LOGS;
  }
}

export function getApiLogs(limit = 100) {
  return apiLogs.slice(0, Math.max(1, Math.min(Number(limit || 100), MAX_API_LOGS)));
}
