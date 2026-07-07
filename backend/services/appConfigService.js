import fs from "fs/promises";
import path from "path";

const appConfigPath = path.resolve("backend", "data", "app-config.json");

const defaultAppConfig = {
  dashboardRefreshSeconds: 30,
  historyPageSize: 100,
  adminPageSize: 25,
  apiLogViewLimit: 100,
  allowDatasetDeletion: true,
  allowAnalysisDeletion: true,
  allowModelRetrain: true,
  allowUserRoleEditing: true,
  maintenanceMode: false,
  adminBanner: "",
};

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

export async function getAppConfiguration() {
  try {
    const raw = await fs.readFile(appConfigPath, "utf8");
    return sanitizeAppConfig(JSON.parse(raw));
  } catch {
    return defaultAppConfig;
  }
}

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

export function getDefaultAppConfiguration() {
  return { ...defaultAppConfig };
}
