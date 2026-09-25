/**
 * ============================================================================
 * SHËRBIMI I KONFIGURIMIT TË APLIKACIONIT (appConfigService.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar ruan dhe menaxhon cilësimet (rregullimet) e përgjithshme të sistemit.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Ashtu si tek celulari ku mund të ndryshoni ndriçimin, gjuhën apo njoftimet,
 * edhe ky aplikacion ka cilësime që administratori mund t'i ndryshojë sipas dëshirës:
 * - Sa shpesh të rifreskohet paneli kryesor (p.sh. çdo 30 sekonda)
 * - Sa artikuj të shfaqen për faqe në historik (p.sh. 100 artikuj)
 * - A lejohet fshirja e lajmeve dhe analizave nga adminët
 * - Modaliteti i mirëmbajtjes (Maintenance mode - fik përkohësisht sistemin për riparime)
 * - Njoftimi me shirit (Banner) në krye të faqes
 * Të gjitha këto ruhen në skedarin `app-config.json`.
 */

import fs from "fs/promises";
import path from "path";

// Vendndodhja e skedarit të konfigurimeve
const appConfigPath = path.resolve("backend", "data", "app-config.json");

// Konfigurimet fillestare të parazgjedhura (Default)
const defaultAppConfig = {
  dashboardRefreshSeconds: 30, // Koha e rifreskimit automatik të faqes
  historyPageSize: 100,        // Numri i artikujve në historik për faqe
  adminPageSize: 25,           // Numri i artikujve në panelin e adminit për faqe
  apiLogViewLimit: 100,        // Sa logje të shfaqen
  allowDatasetDeletion: true,  // A lejohet fshirja e artikujve
  allowAnalysisDeletion: true, // A lejohet fshirja e analizave
  allowModelRetrain: true,     // A lejohet ritrajnimi i modelit AI
  allowUserRoleEditing: true,  // A lejohet ndryshimi i roleve të përdoruesve
  maintenanceMode: false,      // A është aplikacioni në mirëmbajtje
  adminBanner: "",             // Mesazh njoftimi për të gjithë përdoruesit
};

/**
 * Funksion ndihmës: Kontrollon dhe siguron që vlerat e vendosura të jenë të sakta
 * (p.sh. që sekondat të mos jenë nën 10 ose mbi 300).
 */
function sanitizeAppConfig(input = {}) {
  const config = {
    ...defaultAppConfig,
    ...(input || {}),
  };

  return {
    dashboardRefreshSeconds: Math.max(10, Math.min(300, Number(config.dashboardRefreshSeconds || defaultAppConfig.dashboardRefreshSeconds))),
    historyPageSize: Math.max(10, Math.min(500, Number(config.historyPageSize || defaultAppConfig.historyPageSize))),
    adminPageSize: Math.max(5, Math.min(100, Number(config.adminPageSize || defaultAppConfig.adminPageSize))),
    apiLogViewLimit: Math.max(20, Math.min(250, Number(config.apiLogViewLimit || defaultAppConfig.apiLogViewLimit))),
    allowDatasetDeletion: Boolean(config.allowDatasetDeletion),
    allowAnalysisDeletion: Boolean(config.allowAnalysisDeletion),
    allowModelRetrain: Boolean(config.allowModelRetrain),
    allowUserRoleEditing: Boolean(config.allowUserRoleEditing),
    maintenanceMode: Boolean(config.maintenanceMode),
    adminBanner: String(config.adminBanner || "").trim().slice(0, 200),
  };
}

/**
 * Lexon konfigurimet aktuale nga skedari në disk.
 * Nëse skedari nuk gjendet, kthen vlerat e paracaktuara.
 */
export async function getAppConfiguration() {
  try {
    const raw = await fs.readFile(appConfigPath, "utf8");
    return sanitizeAppConfig(JSON.parse(raw));
  } catch {
    return defaultAppConfig;
  }
}

/**
 * Ruan ndryshimet e reja që bën administratori në skedarin në disk.
 */
export async function updateAppConfiguration(patch = {}) {
  const current = await getAppConfiguration();
  const next = sanitizeAppConfig({
    ...current,
    ...(patch || {}),
  });

  await fs.mkdir(path.dirname(appConfigPath), { recursive: true });
  await fs.writeFile(appConfigPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

/**
 * Kthen një kopje të konfigurimeve fillestare.
 */
export function getDefaultAppConfiguration() {
  return { ...defaultAppConfig };
}
