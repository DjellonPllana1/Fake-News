import fs from "fs/promises";
import os from "os";
import path from "path";
import { readDatabase } from "../database.js";
import { getModelMetrics } from "./modelService.js";

const modelArtifactPath = path.resolve("backend", "models", "best_model.joblib");
const metricsArtifactPath = path.resolve("backend", "models", "model_metrics.json");

async function safeStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

export async function getSystemDiagnostics() {
  const [database, metrics, modelStat, metricsStat] = await Promise.all([
    readDatabase(),
    getModelMetrics(),
    safeStat(modelArtifactPath),
    safeStat(metricsArtifactPath),
  ]);
  const memory = process.memoryUsage();

  return {
    status: "ok",
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.round(process.uptime()),
      pid: process.pid,
      cwd: process.cwd(),
      hostname: os.hostname(),
      cpuCount: os.cpus().length,
      totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    },
    configuration: {
      dbClient: process.env.DB_CLIENT || "json",
      port: Number(process.env.PORT || 4000),
      confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD || 0.72),
      mlWeight: Number(process.env.ML_WEIGHT || 0.68),
      ruleWeight: Number(process.env.RULE_WEIGHT || 0.32),
      fetchTimeoutMs: Number(process.env.FETCH_TIMEOUT_MS || 15000),
      evidenceProviders: String(process.env.EVIDENCE_PROVIDERS || "local_trusted_corpus"),
      evidenceMatchThreshold: Number(process.env.EVIDENCE_MATCH_THRESHOLD || 0.16),
      evidenceProviderLimit: Number(process.env.EVIDENCE_PROVIDER_LIMIT || 8),
    },
    storage: {
      databaseArticles: database.articles.length,
      databaseAnalyses: database.analyses.length,
      lastAnalysisAt: database.meta.lastAnalysisAt || null,
      modelArtifactExists: Boolean(modelStat),
      modelArtifactSizeKb: modelStat ? Math.round(modelStat.size / 1024) : 0,
      modelArtifactUpdatedAt: modelStat?.mtime?.toISOString() || null,
      metricsArtifactExists: Boolean(metricsStat),
      metricsArtifactUpdatedAt: metricsStat?.mtime?.toISOString() || null,
    },
    model: {
      status: metrics.status || "trained",
      version: metrics.model_version || metrics.best_model?.version || null,
      bestModel: metrics.best_model?.name || null,
      generatedAt: metrics.generated_at || null,
      preprocessing: metrics.preprocessing || null,
    },
  };
}
