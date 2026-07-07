import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import "../env.js";
import { formatDateTime, timeAgo } from "../utils/date.js";
import { clampConfidence, getRiskLevel, normalizeResultLabel } from "../utils/labels.js";
import { getSourceReputation } from "./sourceReputationService.js";

export const databaseFile = path.resolve("backend", "database.json");
const useMysql = process.env.DB_CLIENT === "mysql";
let pool;

const starterUsers = [
  { name: "Arta Krasniqi", email: "arta@demo.com", role: "Admin", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
  { name: "Liridon Gashi", email: "liridon@demo.com", role: "Analyst", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
  { name: "Bora Shala", email: "bora@demo.com", role: "User", status: "Inactive", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
  { name: "Dion Pllana", email: "dion@demo.com", role: "Admin", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
];

const starterNotifications = [
  { id: 1, title: "Platform ready", text: "The fake news detection platform is ready for article analysis.", time: "Just now", unread: true },
  { id: 2, title: "Model pipeline updated", text: "TF-IDF model comparison is available in the metrics dashboard.", time: "10 min ago", unread: false },
];

function safeJsonParse(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function normalizeUser(user = {}) {
  const fallback = starterUsers.find((item) => item.email === user.email);
  return {
    name: user.name || fallback?.name || "Unknown User",
    email: user.email || fallback?.email || "",
    role: user.role || fallback?.role || "User",
    status: user.status || fallback?.status || "Active",
    passwordHash: user.passwordHash || user.password_hash || fallback?.passwordHash || "",
  };
}

function normalizeNotification(notification = {}) {
  return {
    id: Number(notification.id || Date.now()),
    title: notification.title || "Notification",
    text: notification.text || notification.message || "",
    time: notification.time || notification.time_label || "Just now",
    unread: Boolean(notification.unread),
  };
}

function normalizeArticle(article = {}, index = 0) {
  return {
    id: article.id || `ARTICLE-${index + 1}`,
    title: String(article.title || "Untitled Article").trim(),
    text: String(article.text || "").trim(),
    subject: String(article.subject || "General").trim(),
    source: String(article.source || "Unknown source").trim(),
    label: normalizeResultLabel(article.label) === "FAKE" ? "FAKE" : "REAL",
    date: String(article.date || article.published_date || "").slice(0, 10),
  };
}

function inferTrustLevel(score) {
  const value = Number(score || 0);
  const highThreshold = Number(process.env.TRUST_SCORE_HIGH_THRESHOLD || 75);
  const mediumThreshold = Number(process.env.TRUST_SCORE_MEDIUM_THRESHOLD || 55);

  if (value >= highThreshold) {
    return "High credibility";
  }

  if (value >= mediumThreshold) {
    return "Moderate credibility";
  }

  return "Low credibility";
}

function normalizeAnalysis(item = {}, index = 0) {
  const label = normalizeResultLabel(item.label);
  const confidence = Math.min(100, Math.max(0, Math.round(Number(item.confidence ?? Number(item.confidenceScore || 0) * 100) || 0)));
  const confidenceScore = clampConfidence(item.confidenceScore ?? confidence / 100);
  const trustScore = Number(item.trustScore || item.credibilityScore || item.credibility?.score || 0) || 0;
  const sourceReputation = item.sourceReputation || getSourceReputation(item.url || item.source);

  return {
    id: item.id || `AN-${Date.now()}-${index + 1}`,
    title: String(item.title || "Untitled Article").trim(),
    source: String(item.source || "Manual input").trim(),
    url: String(item.url || "").trim(),
    label,
    prediction: label,
    confidence,
    confidenceScore,
    model: String(item.model || "Unknown model").trim(),
    date: String(item.date || formatDateTime()).slice(0, 16),
    language: String(item.language || item.languageInfo?.name || "English").trim(),
    languageInfo: item.languageInfo || {
      code: item.language ? String(item.language).slice(0, 2).toLowerCase() : "unknown",
      name: String(item.language || "English").trim(),
      confidence: 0,
      distribution: [],
      sampleSize: 0,
    },
    riskLevel: String(item.riskLevel || item.risk_level || getRiskLevel(label, confidenceScore)).trim(),
    explanation: String(item.explanation || "").trim(),
    recommendation: String(item.recommendation || "").trim(),
    summary: String(item.summary || "").trim(),
    keywords: Array.isArray(item.keywords) ? item.keywords : Array.isArray(item.explanationKeywords) ? item.explanationKeywords : [],
    keywordMetadata: item.keywordMetadata || item.nlpMetadata?.keywordExtraction || null,
    influentialKeywords: Array.isArray(item.influentialKeywords) ? item.influentialKeywords : [],
    probabilities: item.probabilities || null,
    modelProbabilities: item.modelProbabilities || null,
    warning: String(item.warning || "").trim(),
    articleId: item.articleId || item.article_id || null,
    articleText: String(item.articleText || "").trim(),
    textPreview: String(item.textPreview || "").trim(),
    author: String(item.author || "").trim(),
    publishedAt: String(item.publishedAt || item.published_at || "").trim(),
    credibilityScore: trustScore,
    baseCredibilityScore: Number(item.baseCredibilityScore || 0) || 0,
    evidenceAdjustedCredibilityScore: Number(item.evidenceAdjustedCredibilityScore || item.credibilityScore || 0) || 0,
    trustScore,
    trustLevel: String(item.trustLevel || inferTrustLevel(trustScore)).trim(),
    trustExplanation: String(item.trustExplanation || "").trim(),
    trustReasons: Array.isArray(item.trustReasons) ? item.trustReasons : [],
    trustSignals: Array.isArray(item.trustSignals) ? item.trustSignals : [],
    trustWeights: item.trustWeights || null,
    sourceReputation,
    modelVersion: String(item.modelVersion || "").trim(),
    modelGeneratedAt: String(item.modelGeneratedAt || "").trim(),
    suspiciousSentences: Array.isArray(item.suspiciousSentences) ? item.suspiciousSentences : [],
    ruleFindings: Array.isArray(item.ruleFindings) ? item.ruleFindings : [],
    sentiment: item.sentiment || null,
    entities: item.entities || { people: [], organizations: [], locations: [], dates: [], sources: [] },
    topicDetection: item.topicDetection || item.nlpMetadata?.topicDetection || null,
    articleCategory: item.articleCategory || item.nlpMetadata?.articleCategory || null,
    readingComplexity: item.readingComplexity || item.nlpMetadata?.readingComplexity || null,
    writingStyle: item.writingStyle || item.nlpMetadata?.writingStyle || null,
    emotion: item.emotion || item.nlpMetadata?.emotion || null,
    nlpMetadata: item.nlpMetadata || null,
    articleStats: item.articleStats || null,
    credibility: item.credibility || null,
    evidence: item.evidence || null,
    claimAnalyses: Array.isArray(item.claimAnalyses) ? item.claimAnalyses : [],
    mainClaims: Array.isArray(item.mainClaims) ? item.mainClaims : [],
    trustedSourcesFound: Array.isArray(item.trustedSourcesFound) ? item.trustedSourcesFound : [],
    supportingArticlesCount: Number(item.supportingArticlesCount || 0) || 0,
    contradictingArticlesCount: Number(item.contradictingArticlesCount || 0) || 0,
    supportedClaimsCount: Number(item.supportedClaimsCount || 0) || 0,
    contradictedClaimsCount: Number(item.contradictedClaimsCount || 0) || 0,
    unverifiedClaimsCount: Number(item.unverifiedClaimsCount || 0) || 0,
    similarityScore: Number(item.similarityScore || 0) || 0,
    evidenceConfidence: Number(item.evidenceConfidence || 0) || 0,
    evidenceVerdict: String(item.evidenceVerdict || "").trim(),
  };
}

export function createEmptyDatabase() {
  return {
    meta: {
      name: "Fake News Detection Local Database",
      version: 2,
      seededAt: null,
      lastAnalysisAt: null,
    },
    articles: [],
    analyses: [],
    users: starterUsers,
    notifications: starterNotifications,
  };
}

function normalizeDatabase(database = {}) {
  return {
    ...createEmptyDatabase(),
    ...database,
    meta: {
      ...createEmptyDatabase().meta,
      ...(database.meta || {}),
    },
    articles: (database.articles || []).map(normalizeArticle),
    analyses: (database.analyses || []).map(normalizeAnalysis),
    users: (database.users || starterUsers).map(normalizeUser),
    notifications: (database.notifications || starterNotifications).map(normalizeNotification),
  };
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "fake_news_ui",
      waitForConnections: true,
      connectionLimit: 10,
      multipleStatements: true,
    });
  }

  return pool;
}

export async function ensureDatabaseSchema() {
  if (!useMysql) {
    return;
  }

  const db = getPool();
  const statements = [
    "ALTER TABLE articles MODIFY label VARCHAR(40) NOT NULL",
    "ALTER TABLE analyses MODIFY label VARCHAR(40) NOT NULL",
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS url VARCHAR(700) NULL AFTER source",
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS risk_level VARCHAR(30) NULL AFTER model",
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS details_json JSON NULL AFTER article_id",
  ];

  for (const statement of statements) {
    try {
      await db.query(statement);
    } catch (error) {
      if (process.env.DEBUG_DB === "1") {
        console.warn(`Schema update skipped: ${statement}`, error.message);
      }
    }
  }
}

async function readMysqlDatabase() {
  const db = getPool();
  const [articles] = await db.query("SELECT id, title, text, subject, source, label, published_date FROM articles ORDER BY published_date DESC, id DESC LIMIT 3000");
  const [analyses] = await db.query("SELECT id, title, source, url, label, confidence, model, risk_level, analyzed_at, language, article_id, details_json FROM analyses ORDER BY analyzed_at DESC LIMIT 500");
  const [users] = await db.query("SELECT name, email, role, status, password_hash FROM users ORDER BY name");
  const [notifications] = await db.query("SELECT id, title, message, time_label, unread FROM notifications ORDER BY id DESC LIMIT 20");

  return normalizeDatabase({
    meta: {
      name: "Fake News Detection MySQL Database",
      version: 2,
    },
    articles: articles.map((row) => ({
      id: row.id,
      title: row.title,
      text: row.text,
      subject: row.subject,
      source: row.source,
      label: row.label,
      date: row.published_date,
    })),
    analyses: analyses.map((row) => {
      const details = safeJsonParse(row.details_json, {}) || {};
      return {
        ...details,
        id: row.id,
        title: row.title,
        source: row.source,
        url: row.url,
        label: row.label,
        confidence: row.confidence,
        model: row.model,
        riskLevel: row.risk_level,
        date: row.analyzed_at ? formatDateTime(row.analyzed_at) : formatDateTime(),
        language: row.language,
        articleId: row.article_id,
      };
    }),
    users: users.map((row) => ({
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      passwordHash: row.password_hash,
    })),
    notifications: notifications.map((row) => ({
      id: row.id,
      title: row.title,
      text: row.message,
      time: row.time_label,
      unread: Boolean(row.unread),
    })),
  });
}

export async function readDatabase() {
  if (useMysql) {
    return readMysqlDatabase();
  }

  try {
    const content = await fs.readFile(databaseFile, "utf8");
    return normalizeDatabase(JSON.parse(content));
  } catch {
    const database = createEmptyDatabase();
    await writeDatabase(database);
    return database;
  }
}

export async function writeDatabase(database) {
  if (useMysql) {
    return;
  }

  await fs.mkdir(path.dirname(databaseFile), { recursive: true });
  await fs.writeFile(databaseFile, JSON.stringify(normalizeDatabase(database), null, 2), "utf8");
}

export async function saveAnalysis(item, notification) {
  const analysis = normalizeAnalysis(item);
  const normalizedNotification = normalizeNotification(notification);

  if (!useMysql) {
    const database = await readDatabase();
    database.meta.lastAnalysisAt = analysis.date;
    database.analyses.unshift(analysis);
    database.analyses = database.analyses.slice(0, 500);
    database.notifications.unshift(normalizedNotification);
    database.notifications = database.notifications.slice(0, 20);
    await writeDatabase(database);
    return analysis;
  }

  const db = getPool();
  const detailsJson = JSON.stringify({
    confidenceScore: analysis.confidenceScore,
    explanation: analysis.explanation,
    recommendation: analysis.recommendation,
    summary: analysis.summary,
    keywords: analysis.keywords,
    keywordMetadata: analysis.keywordMetadata,
    influentialKeywords: analysis.influentialKeywords,
    probabilities: analysis.probabilities,
    modelProbabilities: analysis.modelProbabilities,
    warning: analysis.warning,
    articleText: analysis.articleText,
    textPreview: analysis.textPreview,
    author: analysis.author,
    publishedAt: analysis.publishedAt,
    credibilityScore: analysis.credibilityScore,
    baseCredibilityScore: analysis.baseCredibilityScore,
    evidenceAdjustedCredibilityScore: analysis.evidenceAdjustedCredibilityScore,
    trustScore: analysis.trustScore,
    trustLevel: analysis.trustLevel,
    trustExplanation: analysis.trustExplanation,
    trustReasons: analysis.trustReasons,
    trustSignals: analysis.trustSignals,
    trustWeights: analysis.trustWeights,
    sourceReputation: analysis.sourceReputation,
    modelVersion: analysis.modelVersion,
    modelGeneratedAt: analysis.modelGeneratedAt,
    suspiciousSentences: analysis.suspiciousSentences,
    ruleFindings: analysis.ruleFindings,
    sentiment: analysis.sentiment,
    entities: analysis.entities,
    languageInfo: analysis.languageInfo,
    topicDetection: analysis.topicDetection,
    articleCategory: analysis.articleCategory,
    readingComplexity: analysis.readingComplexity,
    writingStyle: analysis.writingStyle,
    emotion: analysis.emotion,
    nlpMetadata: analysis.nlpMetadata,
    articleStats: analysis.articleStats,
    credibility: analysis.credibility,
    evidence: analysis.evidence,
    claimAnalyses: analysis.claimAnalyses,
    mainClaims: analysis.mainClaims,
    trustedSourcesFound: analysis.trustedSourcesFound,
    supportingArticlesCount: analysis.supportingArticlesCount,
    contradictingArticlesCount: analysis.contradictingArticlesCount,
    supportedClaimsCount: analysis.supportedClaimsCount,
    contradictedClaimsCount: analysis.contradictedClaimsCount,
    unverifiedClaimsCount: analysis.unverifiedClaimsCount,
    similarityScore: analysis.similarityScore,
    evidenceConfidence: analysis.evidenceConfidence,
    evidenceVerdict: analysis.evidenceVerdict,
  });

  await db.execute(
    `INSERT INTO analyses (id, title, source, url, label, confidence, model, risk_level, analyzed_at, language, article_id, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       source = VALUES(source),
       url = VALUES(url),
       label = VALUES(label),
       confidence = VALUES(confidence),
       model = VALUES(model),
       risk_level = VALUES(risk_level),
       analyzed_at = VALUES(analyzed_at),
       language = VALUES(language),
       article_id = VALUES(article_id),
       details_json = VALUES(details_json)`,
    [
      analysis.id,
      analysis.title,
      analysis.source,
      analysis.url || null,
      analysis.label,
      analysis.confidence,
      analysis.model,
      analysis.riskLevel,
      new Date(analysis.date.replace(" ", "T")),
      analysis.language,
      analysis.articleId,
      detailsJson,
    ]
  );

  await db.execute(
    "INSERT INTO notifications (title, message, time_label, unread) VALUES (?, ?, ?, ?)",
    [normalizedNotification.title, normalizedNotification.text, normalizedNotification.time, normalizedNotification.unread ? 1 : 0]
  );

  return analysis;
}

export async function updateUserByEmail(email, updates = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  if (!useMysql) {
    const database = await readDatabase();
    const index = database.users.findIndex((user) => user.email.toLowerCase() === normalizedEmail);

    if (index === -1) {
      return null;
    }

    const current = database.users[index];
    const next = normalizeUser({
      ...current,
      ...updates,
      email: current.email,
      passwordHash: current.passwordHash,
    });

    database.users[index] = next;
    await writeDatabase(database);
    return normalizeUser(next);
  }

  const db = getPool();
  const [rows] = await db.query("SELECT name, email, role, status, password_hash FROM users WHERE LOWER(email) = ? LIMIT 1", [normalizedEmail]);
  const existing = Array.isArray(rows) ? rows[0] : null;

  if (!existing) {
    return null;
  }

  const next = normalizeUser({
    name: updates.name ?? existing.name,
    email: existing.email,
    role: updates.role ?? existing.role,
    status: updates.status ?? existing.status,
    passwordHash: existing.password_hash,
  });

  await db.execute("UPDATE users SET name = ?, role = ?, status = ? WHERE email = ?", [next.name, next.role, next.status, next.email]);
  return next;
}

export async function deleteAnalysisById(analysisId) {
  const normalizedId = String(analysisId || "").trim();

  if (!normalizedId) {
    return false;
  }

  if (!useMysql) {
    const database = await readDatabase();
    const nextAnalyses = database.analyses.filter((item) => item.id !== normalizedId);

    if (nextAnalyses.length === database.analyses.length) {
      return false;
    }

    database.analyses = nextAnalyses;
    database.meta.lastAnalysisAt = nextAnalyses[0]?.date || null;
    await writeDatabase(database);
    return true;
  }

  const db = getPool();
  const [result] = await db.execute("DELETE FROM analyses WHERE id = ?", [normalizedId]);
  return Boolean(result?.affectedRows);
}

export async function deleteArticleById(articleId) {
  const normalizedId = String(articleId || "").trim();

  if (!normalizedId) {
    return false;
  }

  if (!useMysql) {
    const database = await readDatabase();
    const nextArticles = database.articles.filter((item) => item.id !== normalizedId);

    if (nextArticles.length === database.articles.length) {
      return false;
    }

    database.articles = nextArticles;
    await writeDatabase(database);
    return true;
  }

  const db = getPool();
  const [result] = await db.execute("DELETE FROM articles WHERE id = ?", [normalizedId]);
  return Boolean(result?.affectedRows);
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const database = await readDatabase();
  return database.users.find((user) => user.email.toLowerCase() === normalizedEmail) || null;
}

export function toAnalysisRow(item) {
  const analysis = normalizeAnalysis(item);
  return {
    ...analysis,
    timeAgo: timeAgo(analysis.date),
  };
}
