import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { readDatabase } from "../database.js";
import { isDatabaseEnabled } from "../config/database.js";
import { MetricsRepository } from "../repositories/MetricsRepository.js";
import { formatDateTime } from "../utils/date.js";
import { clampConfidence, getRiskLevel, normalizeResultLabel } from "../utils/labels.js";
import { resolvePythonInvocation } from "../utils/pythonCommand.js";
import { buildExtractiveSummary, extractKeywordCandidates } from "../utils/text.js";
import { getHostname, isTrustedSource } from "./articleFetchService.js";

const modelMetricsPaths = [path.resolve("ml", "metrics", "metrics.json"), path.resolve("backend", "models", "model_metrics.json")];
const predictionScriptPath = path.resolve("ml", "predict.py");
const trainingScriptPath = path.resolve("ml", "train_models.py");
const metricsRepository = new MetricsRepository();

const fakePatterns = [
  /\b(shocking|hoax|miracle|secret|exposed|conspiracy|cover[- ]?up)\b/i,
  /\byou won'?t believe\b/i,
  /\banonymous sources claim\b/i,
  /\bwithout evidence\b/i,
  /\bguaranteed cure\b/i,
];

const realPatterns = [
  /\baccording to\b/i,
  /\bpublished\b/i,
  /\breported\b/i,
  /\bconfirmed\b/i,
  /\bofficials?\b/i,
  /\bstudy\b/i,
];

function getConfidenceThreshold() {
  const parsed = Number(process.env.CONFIDENCE_THRESHOLD || 0.72);

  if (!Number.isFinite(parsed)) {
    return 0.72;
  }

  return Math.min(0.95, Math.max(0.5, parsed));
}

function formatProbabilityMap(probabilities = {}) {
  const normalized = {
    REAL: 0,
    FAKE: 0,
    UNCERTAIN: 0,
  };

  Object.entries(probabilities).forEach(([label, value]) => {
    normalized[normalizeResultLabel(label)] = clampConfidence(value);
  });

  return normalized;
}

function formatBinaryProbabilities(probabilities = {}) {
  const normalized = formatProbabilityMap(probabilities);
  const realProbability = clampConfidence(normalized.REAL);
  const fakeProbability = clampConfidence(normalized.FAKE);

  if (realProbability <= 0 && fakeProbability <= 0) {
    return {
      REAL: 0.5,
      FAKE: 0.5,
    };
  }

  const total = realProbability + fakeProbability || 1;

  return {
    REAL: Number((realProbability / total).toFixed(4)),
    FAKE: Number((fakeProbability / total).toFixed(4)),
  };
}

async function readFirstMetricsFile() {
  for (const filePath of modelMetricsPaths) {
    try {
      return await readFile(filePath, "utf8");
    } catch {
      // Try the next location.
    }
  }

  throw new Error("No model metrics file was found.");
}

function normalizeInfluentialKeywords(items = [], fallbackTerms = []) {
  if (Array.isArray(items) && items.length) {
    return items
      .map((item) => {
        if (typeof item === "string") {
          return {
            term: item,
            weight: 0.5,
            direction: "supports",
          };
        }

        return {
          term: String(item.term || item.keyword || "").trim(),
          weight: Number(item.weight || item.score || 0),
          direction: item.direction === "opposes" ? "opposes" : "supports",
        };
      })
      .filter((item) => item.term)
      .slice(0, 8);
  }

  return fallbackTerms.slice(0, 8).map((term, index) => ({
    term,
    weight: Number((0.8 - index * 0.08).toFixed(3)),
    direction: "supports",
  }));
}

function runPythonJsonScript(scriptPath, payload = null) {
  return new Promise((resolve, reject) => {
    const invocation = resolvePythonInvocation(scriptPath);
    const child = spawn(invocation.command, invocation.args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ...invocation.env,
      },
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python script exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Unable to parse Python output: ${error.message}`));
      }
    });

    if (payload) {
      child.stdin.write(JSON.stringify(payload));
    }

    child.stdin.end();
  });
}

function buildExplanation({ label, source, explanationKeywords, confidenceScore, threshold, model, warning }) {
  const hostname = getHostname(source);
  const keywords = explanationKeywords.slice(0, 6).join(", ");
  const readableThreshold = Math.round(threshold * 100);
  const readableConfidence = Math.round(confidenceScore * 100);

  if (label === "UNCERTAIN") {
    return `The model marked this article UNCERTAIN. ${warning || `Confidence did not clear the ${readableThreshold}% threshold for a reliable verdict.`} Key terms considered: ${keywords || "not enough strong keywords"}.`;
  }

  if (label === "FAKE") {
    return `The ${model} pipeline found patterns that align more strongly with misleading or sensational content. Confidence is ${readableConfidence}%. Key TF-IDF signals: ${keywords || "not enough strong keywords"}.${hostname ? ` Source checked: ${hostname}.` : ""}`;
  }

  return `The ${model} pipeline found language that is closer to legitimate reporting patterns. Confidence is ${readableConfidence}%. Key TF-IDF signals: ${keywords || "not enough strong keywords"}.${hostname ? ` Source checked: ${hostname}.` : ""}`;
}

function buildFallbackPrediction({ headline = "", text = "", source = "", url = "" }) {
  const combined = `${headline} ${text}`.trim();
  const combinedLower = combined.toLowerCase();
  const threshold = getConfidenceThreshold();
  const keywordCandidates = extractKeywordCandidates(combined, 8);
  const fakeScore = fakePatterns.reduce((count, pattern) => count + (pattern.test(combinedLower) ? 1 : 0), 0);
  const realScore = realPatterns.reduce((count, pattern) => count + (pattern.test(combinedLower) ? 1 : 0), 0) + (isTrustedSource(url || source) ? 2 : 0);
  const margin = realScore - fakeScore;
  const textWordCount = combined.split(/\s+/).filter(Boolean).length;

  let label = "UNCERTAIN";
  let confidenceScore = 0.55;
  let warning = `The ML runtime is unavailable, so the platform used a heuristic fallback. Results with confidence below ${Math.round(threshold * 100)}% are marked UNCERTAIN.`;

  if (textWordCount >= 45 && Math.abs(margin) >= 2) {
    label = margin > 0 ? "REAL" : "FAKE";
    confidenceScore = Math.min(0.89, 0.6 + Math.abs(margin) * 0.08);
    warning = "";
  }

  if (confidenceScore < threshold) {
    label = "UNCERTAIN";
  }

  const probabilities =
    label === "FAKE"
      ? { FAKE: confidenceScore, REAL: Number((1 - confidenceScore).toFixed(4)), UNCERTAIN: 0 }
      : label === "REAL"
        ? { REAL: confidenceScore, FAKE: Number((1 - confidenceScore).toFixed(4)), UNCERTAIN: 0 }
        : { REAL: 0.4, FAKE: 0.4, UNCERTAIN: 0.2 };

  return {
    label,
    predictedLabel: label === "UNCERTAIN" ? (margin > 0 ? "REAL" : "FAKE") : label,
    confidenceScore,
    confidence: Math.round(confidenceScore * 100),
    probabilities: formatProbabilityMap(probabilities),
    modelProbabilities: formatProbabilityMap(probabilities),
    binaryProbabilities: formatBinaryProbabilities(probabilities),
    explanationKeywords: keywordCandidates,
    influentialKeywords: normalizeInfluentialKeywords([], keywordCandidates),
    summary: buildExtractiveSummary({ headline, text }),
    warning,
    model: "Heuristic Fallback Analyzer",
    modelId: "heuristic_fallback",
    modelVersion: "fallback-1",
    modelGeneratedAt: null,
    threshold,
  };
}

export async function predictArticle({ headline = "", text = "", source = "", url = "" }) {
  const threshold = getConfidenceThreshold();

  try {
    const result = await runPythonJsonScript(predictionScriptPath, {
      headline,
      text,
      confidence_threshold: threshold,
    });
    const label = normalizeResultLabel(result.prediction || result.label);
    const rawConfidence = Number(result.confidence_score ?? result.confidence ?? 0);
    const confidenceScore = clampConfidence(rawConfidence > 1 ? rawConfidence / 100 : rawConfidence);
    const fallbackKeywords = extractKeywordCandidates(`${headline} ${text}`, 8);
    const explanationKeywords = Array.isArray(result.explanation_keywords) && result.explanation_keywords.length ? result.explanation_keywords : fallbackKeywords;
    const influentialKeywords = normalizeInfluentialKeywords(result.top_influential_keywords, explanationKeywords);
    const rawModelProbabilities = formatProbabilityMap(result.model_probabilities || result.probabilities);
    const binaryProbabilities = formatBinaryProbabilities(result.binary_probabilities || result.model_probabilities || result.probabilities);
    const warning =
      result.warning ||
      (label === "UNCERTAIN"
        ? `Confidence is below the ${Math.round(threshold * 100)}% threshold, so the result is marked UNCERTAIN.`
        : "");
    const modelName = result.model_name || result.model || "Automatic Best Model";

    return {
      label,
      predictedLabel: normalizeResultLabel(result.predicted_label || result.label),
      confidenceScore,
      confidence: Math.round(confidenceScore * 100),
      probabilities: rawModelProbabilities,
      modelProbabilities: rawModelProbabilities,
      binaryProbabilities,
      explanationKeywords,
      influentialKeywords,
      summary: buildExtractiveSummary({ headline, text }),
      warning,
      model: modelName,
      modelId: result.model_id || null,
      modelVersion: result.model_version || null,
      modelGeneratedAt: result.model_generated_at || result.generated_at || null,
      decisionMargin: Number(result.decision_margin || 0),
      metrics: result.metrics || null,
      preprocessing: result.preprocessing || null,
      threshold,
      generatedAt: formatDateTime(),
      riskLevel: getRiskLevel(label, confidenceScore),
      explanation: buildExplanation({
        label,
        source: url || source,
        explanationKeywords,
        confidenceScore,
        threshold,
        model: modelName,
        warning,
      }),
    };
  } catch (error) {
    console.error(error);
    const fallback = buildFallbackPrediction({ headline, text, source, url });
    return {
      ...fallback,
      riskLevel: getRiskLevel(fallback.label, fallback.confidenceScore),
      explanation: buildExplanation({
        label: fallback.label,
        source: url || source,
        explanationKeywords: fallback.explanationKeywords,
        confidenceScore: fallback.confidenceScore,
        threshold,
        model: fallback.model,
        warning: fallback.warning,
      }),
    };
  }
}

export async function getModelMetrics() {
  try {
    const content = await readFirstMetricsFile();
    const metrics = JSON.parse(content);
    return {
      ...metrics,
      model_version: metrics.model_version || metrics.best_model?.version || null,
      decision_policy: {
        ...(metrics.decision_policy || {}),
        confidence_threshold_default: getConfidenceThreshold(),
        low_confidence_label: "UNCERTAIN",
      },
    };
  } catch {
    return {
      status: "training_required",
      generated_at: null,
      dataset: null,
      best_model: null,
      models: [],
      preprocessing: null,
      decision_policy: {
        confidence_threshold_default: getConfidenceThreshold(),
        low_confidence_label: "UNCERTAIN",
      },
      message: "No trained model metrics were found. Run the training command to generate metrics and the best-model artifact.",
    };
  }
}

export async function retrainModels() {
  const result = await runPythonJsonScript(trainingScriptPath);
  if (isDatabaseEnabled()) {
    await metricsRepository.saveModelMetrics(result);
    await metricsRepository.createTrainingJob({
      status: "completed",
      startedAt: new Date(),
      finishedAt: new Date(),
      details: result,
    });
  }
  return {
    ...result,
    threshold: getConfidenceThreshold(),
  };
}

export async function getHealthStatus() {
  const database = await readDatabase();
  const modelMetrics = await getModelMetrics();

  return {
    status: "ok",
    database: isDatabaseEnabled() ? "mysql" : "json",
    articles: database.articles.length,
    analyses: database.analyses.length,
    modelStatus: modelMetrics.status || "trained",
    bestModel: modelMetrics.best_model?.name || null,
    modelVersion: modelMetrics.model_version || null,
    confidenceThreshold: getConfidenceThreshold(),
  };
}
