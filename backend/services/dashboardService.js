import { readDatabase, toAnalysisRow } from "../database.js";
import { formatDateTime } from "../utils/date.js";
import { summarizeDistribution } from "../utils/labels.js";
import { getHealthStatus, getModelMetrics } from "./modelService.js";

function average(values = []) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function resolveTrustScore(item = {}) {
  const candidates = [
    Number(item.trustScore || 0),
    Number(item.credibilityScore || 0),
    Number(item.evidenceAdjustedCredibilityScore || 0),
    Number(item.baseCredibilityScore || 0),
    Number(item.confidence || 0),
  ].filter((value) => Number.isFinite(value) && value > 0);

  return candidates[0] || 0;
}

function parseAnalysisDate(value = "") {
  const parsed = new Date(String(value || "").replace(" ", "T"));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key) {
  const parsed = new Date(`${key}-01T00:00:00Z`);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date) {
  const normalized = startOfUtcDay(date);
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - day + 1);
  return normalized;
}

function formatWeekLabel(date) {
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
}

function buildConfidenceHistogram(analyses = []) {
  const buckets = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ];

  analyses.forEach((item) => {
    const confidence = Number(item.confidence || 0);
    const bucket = buckets.find((entry) => confidence >= entry.min && confidence <= entry.max) || buckets[0];
    bucket.count += 1;
  });

  return buckets.map(({ range, count }) => ({ range, count }));
}

function buildModelComparison(modelMetrics = {}) {
  return (modelMetrics.models || []).map((item) => ({
    id: item.id,
    name: item.name,
    accuracy: Number(item.accuracy || 0),
    precision: Number(item.precision || 0),
    recall: Number(item.recall || 0),
    f1: Number(item.f1 || 0),
    isBestModel: item.id === modelMetrics.best_model?.id,
    version: item.version || modelMetrics.model_version || null,
  }));
}

function buildMostAnalyzedDomains(analyses = [], limit = 8) {
  const usage = new Map();

  analyses.forEach((item) => {
    const domain = item.sourceReputation?.domain || item.articleStats?.sourceHost || "";

    if (!domain || domain === "Unknown domain") {
      return;
    }

    const current = usage.get(domain) || {
      domain,
      count: 0,
      trustScores: [],
      badge: item.sourceReputation?.badge || "Unknown",
    };

    current.count += 1;
    current.badge = item.sourceReputation?.badge || current.badge;

    const trustScore = resolveTrustScore(item);

    if (trustScore > 0) {
      current.trustScores.push(trustScore);
    }

    usage.set(domain, current);
  });

  return [...usage.values()]
    .map((item) => ({
      domain: item.domain,
      count: item.count,
      averageTrustScore: Math.round(average(item.trustScores)),
      badge: item.badge,
    }))
    .sort((left, right) => right.count - left.count || right.averageTrustScore - left.averageTrustScore)
    .slice(0, limit);
}

function buildMostCommonEntities(analyses = [], limit = 10) {
  const entityCounts = new Map();
  const fallbackEntityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

  analyses.forEach((item) => {
    let structuredCount = 0;

    Object.entries(item.entities || {}).forEach(([category, values]) => {
      (Array.isArray(values) ? values : []).forEach((value) => {
        const normalized = String(value || "").trim();

        if (!normalized) {
          return;
        }

        structuredCount += 1;
        const key = `${category}::${normalized.toLowerCase()}`;
        const current = entityCounts.get(key) || {
          entity: normalized,
          category,
          count: 0,
        };

        current.count += 1;
        entityCounts.set(key, current);
      });
    });

    if (!structuredCount) {
      const fallbackText = `${item.title || ""} ${item.mainClaims?.join(" ") || ""}`;
      const matches = [...fallbackText.matchAll(fallbackEntityPattern)].map((match) => match[1]).filter((value) => value.length > 3).slice(0, 6);

      matches.forEach((value) => {
        const key = `topics::${value.toLowerCase()}`;
        const current = entityCounts.get(key) || {
          entity: value,
          category: "topics",
          count: 0,
        };

        current.count += 1;
        entityCounts.set(key, current);
      });
    }
  });

  return [...entityCounts.values()]
    .sort((left, right) => right.count - left.count || left.entity.localeCompare(right.entity))
    .slice(0, limit);
}

function buildTopSuspiciousKeywords(analyses = [], limit = 8) {
  const keywordScores = new Map();

  analyses
    .filter((item) => item.label !== "REAL" || Number(item.trustScore || item.credibilityScore || 0) < 60 || item.riskLevel === "HIGH")
    .forEach((item) => {
      const baseBoost = item.label === "FAKE" ? 10 : item.label === "UNCERTAIN" ? 6 : 3;

      (item.influentialKeywords || []).forEach((keyword) => {
        const term = String(keyword.term || keyword.keyword || "").trim();

        if (!term) {
          return;
        }

        const key = term.toLowerCase();
        const current = keywordScores.get(key) || { keyword: term, score: 0, mentions: 0 };
        current.score += Math.max(Number(keyword.weight || 0), 0.08) * 100 + baseBoost;
        current.mentions += 1;
        keywordScores.set(key, current);
      });

      (item.keywords || []).slice(0, 6).forEach((term) => {
        const normalized = String(term || "").trim();

        if (!normalized) {
          return;
        }

        const key = normalized.toLowerCase();
        const current = keywordScores.get(key) || { keyword: normalized, score: 0, mentions: 0 };
        current.score += 5 + baseBoost * 0.4;
        current.mentions += 1;
        keywordScores.set(key, current);
      });
    });

  return [...keywordScores.values()]
    .map((item) => ({
      keyword: item.keyword,
      score: Math.round(item.score),
      mentions: item.mentions,
    }))
    .sort((left, right) => right.score - left.score || right.mentions - left.mentions)
    .slice(0, limit);
}

function buildPredictionTimeline(analyses = [], days = 14) {
  const counts = new Map();
  const today = startOfUtcDay(new Date());

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    counts.set(formatDateKey(date), {
      date: formatDateKey(date),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      REAL: 0,
      FAKE: 0,
      UNCERTAIN: 0,
      total: 0,
      confidenceValues: [],
      trustValues: [],
    });
  }

  analyses.forEach((item) => {
    const parsed = parseAnalysisDate(item.date);

    if (!parsed) {
      return;
    }

    const key = formatDateKey(parsed);
    const bucket = counts.get(key);

    if (!bucket) {
      return;
    }

    bucket[item.label] = (bucket[item.label] || 0) + 1;
    bucket.total += 1;
    bucket.confidenceValues.push(Number(item.confidence || 0));

    const trustScore = resolveTrustScore(item);

    if (trustScore > 0) {
      bucket.trustValues.push(trustScore);
    }
  });

  return [...counts.values()].map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    REAL: bucket.REAL,
    FAKE: bucket.FAKE,
    UNCERTAIN: bucket.UNCERTAIN,
    total: bucket.total,
    averageConfidence: Math.round(average(bucket.confidenceValues)),
    averageTrustScore: Math.round(average(bucket.trustValues)),
  }));
}

function buildWeeklyStatistics(analyses = [], weeks = 8) {
  const buckets = new Map();
  const currentWeek = startOfUtcWeek(new Date());

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const weekStart = new Date(currentWeek);
    weekStart.setUTCDate(currentWeek.getUTCDate() - offset * 7);
    const key = formatDateKey(weekStart);
    buckets.set(key, {
      weekStart: key,
      label: formatWeekLabel(weekStart),
      total: 0,
      REAL: 0,
      FAKE: 0,
      UNCERTAIN: 0,
      confidenceValues: [],
      trustValues: [],
    });
  }

  analyses.forEach((item) => {
    const parsed = parseAnalysisDate(item.date);

    if (!parsed) {
      return;
    }

    const weekStart = formatDateKey(startOfUtcWeek(parsed));
    const bucket = buckets.get(weekStart);

    if (!bucket) {
      return;
    }

    bucket.total += 1;
    bucket[item.label] = (bucket[item.label] || 0) + 1;
    bucket.confidenceValues.push(Number(item.confidence || 0));

    const trustScore = resolveTrustScore(item);

    if (trustScore > 0) {
      bucket.trustValues.push(trustScore);
    }
  });

  return [...buckets.values()].map((bucket) => ({
    weekStart: bucket.weekStart,
    label: bucket.label,
    total: bucket.total,
    REAL: bucket.REAL,
    FAKE: bucket.FAKE,
    UNCERTAIN: bucket.UNCERTAIN,
    averageConfidence: Math.round(average(bucket.confidenceValues)),
    averageTrustScore: Math.round(average(bucket.trustValues)),
  }));
}

function buildMonthlyStatistics(analyses = [], months = 6) {
  const buckets = new Map();
  const now = new Date();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = formatMonthKey(date);
    buckets.set(key, {
      month: key,
      label: formatMonthLabel(key),
      total: 0,
      REAL: 0,
      FAKE: 0,
      UNCERTAIN: 0,
      confidenceValues: [],
      trustValues: [],
    });
  }

  analyses.forEach((item) => {
    const parsed = parseAnalysisDate(item.date);

    if (!parsed) {
      return;
    }

    const key = formatMonthKey(parsed);
    const bucket = buckets.get(key);

    if (!bucket) {
      return;
    }

    bucket.total += 1;
    bucket[item.label] = (bucket[item.label] || 0) + 1;
    bucket.confidenceValues.push(Number(item.confidence || 0));

    const trustScore = resolveTrustScore(item);

    if (trustScore > 0) {
      bucket.trustValues.push(trustScore);
    }
  });

  return [...buckets.values()].map((bucket) => ({
    month: bucket.month,
    label: bucket.label,
    total: bucket.total,
    REAL: bucket.REAL,
    FAKE: bucket.FAKE,
    UNCERTAIN: bucket.UNCERTAIN,
    averageConfidence: Math.round(average(bucket.confidenceValues)),
    averageTrustScore: Math.round(average(bucket.trustValues)),
  }));
}

function buildPredictionStatistics(analyses = []) {
  const sentimentScores = analyses.map((item) => Number(item.sentiment?.score)).filter((value) => Number.isFinite(value));
  const trustScores = analyses.map(resolveTrustScore).filter((value) => Number.isFinite(value) && value > 0);

  return {
    highRiskCount: analyses.filter((item) => item.riskLevel === "HIGH").length,
    mediumRiskCount: analyses.filter((item) => item.riskLevel === "MEDIUM").length,
    lowRiskCount: analyses.filter((item) => item.riskLevel === "LOW").length,
    averageTrustScore: Math.round(average(trustScores)),
    averageCredibility: Math.round(average(trustScores)),
    averageSentimentScore: Number(average(sentimentScores).toFixed(3)),
    trustedSourceCount: analyses.filter((item) => item.articleStats?.trustedSource).length,
  };
}

function buildLiveStatistics(analyses = [], overview = {}, predictionStatistics = {}, systemStatus = {}) {
  const todayKey = formatDateKey(new Date());
  const currentWeekKey = formatDateKey(startOfUtcWeek(new Date()));
  const currentMonthKey = formatMonthKey(new Date());
  const analysesToday = analyses.filter((item) => formatDateKey(parseAnalysisDate(item.date) || new Date(0)) === todayKey).length;
  const analysesThisWeek = analyses.filter((item) => formatDateKey(startOfUtcWeek(parseAnalysisDate(item.date) || new Date(0))) === currentWeekKey).length;
  const analysesThisMonth = analyses.filter((item) => formatMonthKey(parseAnalysisDate(item.date) || new Date(0)) === currentMonthKey).length;
  const suspiciousDomainMentions = analyses.filter((item) => item.sourceReputation?.badge === "Suspicious").length;

  return {
    analysesToday,
    analysesThisWeek,
    analysesThisMonth,
    highRiskCount: predictionStatistics.highRiskCount || 0,
    suspiciousDomainMentions,
    averageConfidence: overview.averageConfidence || 0,
    averageTrustScore: overview.averageTrustScore || 0,
    totalAnalyses: overview.totalAnalyses || 0,
    modelVersion: overview.modelVersion || systemStatus.modelVersion || null,
    systemLabel: systemStatus.status === "ok" ? "Operational" : "Needs attention",
  };
}

function buildRecentActivity(analyses = [], notifications = [], modelMetrics = {}) {
  const analysisActivity = analyses.slice(0, 6).map((item) => ({
    id: item.id,
    type: "analysis",
    title: item.title,
    text: `${item.label} result for ${item.source || "manual input"} at ${item.confidence}% confidence and ${resolveTrustScore(item)}/100 trust.`,
    time: item.timeAgo,
    tone: item.label.toLowerCase(),
  }));
  const notificationActivity = (notifications || []).slice(0, 3).map((item) => ({
    id: `note-${item.id}`,
    type: "notification",
    title: item.title,
    text: item.text,
    time: item.time,
    tone: item.unread ? "uncertain" : "neutral",
  }));
  const modelActivity = modelMetrics.generated_at
    ? [
        {
          id: "model-version",
          type: "model",
          title: modelMetrics.best_model?.name || "Model updated",
          text: `Current model version is ${modelMetrics.model_version || modelMetrics.best_model?.version || "unknown"}.`,
          time: String(modelMetrics.generated_at).slice(0, 10),
          tone: "real",
        },
      ]
    : [];

  return [...analysisActivity, ...notificationActivity, ...modelActivity].slice(0, 10);
}

function buildSystemStatus(healthStatus = {}, database = {}) {
  return {
    status: healthStatus.status || "unknown",
    statusLabel: healthStatus.status === "ok" ? "Operational" : "Degraded",
    database: healthStatus.database || "json",
    modelStatus: healthStatus.modelStatus || "unknown",
    bestModel: healthStatus.bestModel || null,
    modelVersion: healthStatus.modelVersion || null,
    confidenceThreshold: healthStatus.confidenceThreshold || 0.72,
    lastAnalysisAt: database.meta?.lastAnalysisAt || null,
    datasetArticles: database.articles?.length || 0,
    savedAnalyses: database.analyses?.length || 0,
  };
}

export async function getDashboardData() {
  const [database, modelMetrics, healthStatus] = await Promise.all([readDatabase(), getModelMetrics(), getHealthStatus()]);
  const analyses = database.analyses.map(toAnalysisRow);
  const fakeCount = analyses.filter((item) => item.label === "FAKE").length;
  const realCount = analyses.filter((item) => item.label === "REAL").length;
  const uncertainCount = analyses.filter((item) => item.label === "UNCERTAIN").length;
  const averageConfidence = analyses.length
    ? Math.round(analyses.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / analyses.length)
    : 0;
  const averageTrustScore = analyses.length
    ? Math.round(average(analyses.map(resolveTrustScore).filter((value) => value > 0)))
    : 0;
  const predictionStatistics = buildPredictionStatistics(analyses);
  const overview = {
    totalAnalyses: analyses.length,
    fakeCount,
    realCount,
    uncertainCount,
    averageConfidence,
    averageTrustScore,
    averageCredibility: averageTrustScore,
    datasetArticles: database.articles.length,
    bestModel: modelMetrics.best_model?.name || null,
    modelVersion: modelMetrics.model_version || modelMetrics.best_model?.version || null,
  };
  const predictionTimeline = buildPredictionTimeline(analyses, 14);
  const weeklyStatistics = buildWeeklyStatistics(analyses, 8);
  const monthlyStatistics = buildMonthlyStatistics(analyses, 6);
  const mostAnalyzedDomains = buildMostAnalyzedDomains(analyses, 8);
  const mostCommonEntities = buildMostCommonEntities(analyses, 10);
  const topSuspiciousKeywords = buildTopSuspiciousKeywords(analyses, 8);
  const systemStatus = buildSystemStatus(healthStatus, database);
  const liveStatistics = buildLiveStatistics(analyses, overview, predictionStatistics, systemStatus);

  return {
    updatedAt: formatDateTime(),
    overview,
    liveStatistics,
    recentAnalyses: analyses.slice(0, 8),
    recentActivity: buildRecentActivity(analyses, database.notifications, modelMetrics),
    labelDistribution: summarizeDistribution(analyses.length ? analyses : database.articles),
    analysesOverTime: predictionTimeline,
    predictionTimeline,
    confidenceHistogram: buildConfidenceHistogram(analyses),
    predictionStatistics,
    topSuspiciousKeywords,
    mostAnalyzedDomains,
    sourceBreakdown: mostAnalyzedDomains,
    mostCommonEntities,
    weeklyStatistics,
    monthlyStatistics,
    modelComparison: buildModelComparison(modelMetrics),
    systemStatus,
    modelVersion: overview.modelVersion,
    modelGeneratedAt: modelMetrics.generated_at || null,
    notifications: database.notifications,
    users: database.users.map((user) => ({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    })),
  };
}
