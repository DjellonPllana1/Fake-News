<<<<<<< HEAD
/**
 * ============================================================================
 * SHËRBIMI I REGJISTRIMIT TË KËRKESAVE (apiLogService.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar ruan në memorien e kompjuterit 250 kërkesat e fundit që kanë ardhur në server.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Është si kamerat e sigurisë ose regjistri i hyrje-daljeve:
 * Sa herë që dikush bën diçka në faqe, këtu shënohet:
 * - Ora dhe data ekzakte
 * - Cili buton apo faqe u kërkua (path)
 * - Sa shpejt u përgjigj serveri (durationMs)
 * - Cili përdorues e bëri (userEmail)
 * Nëse lista bëhet më e gjatë se 250 shënime, shënimet më të vjetra fshihen automatikisht
 * për të mos zënë vend në memorien e kompjuterit.
 */

// Numri maksimal i kërkesave që mbahen në kujtesë
=======
import { isDatabaseEnabled } from "../config/database.js";
import { LogRepository } from "../repositories/LogRepository.js";

>>>>>>> e5486132ea595ac597196f61296b9a679ed1dcba
const MAX_API_LOGS = 250;
const apiLogs = [];
const logRepository = new LogRepository();

/**
 * Ruan një kërkesë të re në krye të listës (më të rejat të parat).
 */
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

  // Nëse tejkalohet kufiri prej 250, heqim më të vjetrat
  if (apiLogs.length > MAX_API_LOGS) {
    apiLogs.length = MAX_API_LOGS;
  }
}

<<<<<<< HEAD
/**
 * Kthen listën e kërkesave të fundit për t'ia shfaqur administratorit në ekran.
 */
export function getApiLogs(limit = 100) {
  return apiLogs.slice(0, Math.max(1, Math.min(Number(limit || 100), MAX_API_LOGS)));
=======
export async function getApiLogs(limit = 100) {
  const normalizedLimit = Math.max(1, Math.min(Number(limit || 100), MAX_API_LOGS));

  if (isDatabaseEnabled()) {
    return logRepository.list(normalizedLimit);
  }

  return apiLogs.slice(0, normalizedLimit);
>>>>>>> e5486132ea595ac597196f61296b9a679ed1dcba
}
