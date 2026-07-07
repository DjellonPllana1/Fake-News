import { isDatabaseEnabled } from "../config/database.js";
import { LogRepository } from "../repositories/LogRepository.js";

const MAX_API_LOGS = 250;
const apiLogs = [];
const logRepository = new LogRepository();

export function recordApiLog(entry = {}) {
  const logEntry = {
    id: `${Date.now()}-${Math.round(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    method: entry.method || "GET",
    path: entry.path || "/",
    statusCode: Number(entry.statusCode || 0) || 0,
    durationMs: Number(entry.durationMs || 0) || 0,
    userEmail: entry.userEmail || "Anonymous",
    userRole: entry.userRole || "Anonymous",
    ip: entry.ip || "",
  };

  if (isDatabaseEnabled()) {
    logRepository.create(logEntry).catch((error) => {
      if (process.env.DEBUG_DB === "1") {
        console.warn("Unable to persist API log.", error.message);
      }
    });
    return;
  }

  apiLogs.unshift(logEntry);

  if (apiLogs.length > MAX_API_LOGS) {
    apiLogs.length = MAX_API_LOGS;
  }
}

export async function getApiLogs(limit = 100) {
  const normalizedLimit = Math.max(1, Math.min(Number(limit || 100), MAX_API_LOGS));

  if (isDatabaseEnabled()) {
    return logRepository.list(normalizedLimit);
  }

  return apiLogs.slice(0, normalizedLimit);
}
