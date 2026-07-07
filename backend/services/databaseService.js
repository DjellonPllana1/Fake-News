import { readFile } from "fs/promises";
import path from "path";
import { getDatabaseConfig, getPool, isDatabaseEnabled, mysql } from "../config/database.js";
import { readJsonDatabase, writeJsonDatabase, databaseFile } from "../database/jsonStore.js";
import { AnalysisRepository } from "../repositories/AnalysisRepository.js";
import { HistoryRepository } from "../repositories/HistoryRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { formatDateTime, timeAgo } from "../utils/date.js";
import { clampConfidence, getRiskLevel, normalizeResultLabel } from "../utils/labels.js";
import { getSourceReputation } from "./sourceReputationService.js";

export { databaseFile };

const userRepository = new UserRepository();
const analysisRepository = new AnalysisRepository();
const historyRepository = new HistoryRepository();

const starterUsers = [
  { name: "Admin User", email: "admin@demo.com", role: "Admin", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
  { name: "Demo User", email: "demo@demo.com", role: "Analyst", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
];

const starterNotifications = [
  { id: 1, title: "Platform ready", text: "The fake news detection platform is ready for article analysis.", time: "Just now", unread: true },
  { id: 2, title: "Model pipeline updated", text: "TF-IDF model comparison is available in the metrics dashboard.", time: "10 min ago", unread: false },
];

function normalizeUser(user = {}) {
  return {
    name: user.name || "Unknown User",
    email: user.email || "",
    role: user.role || "User",
    status: user.status || "Active",
    passwordHash: user.passwordHash || user.password_hash || "",
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

  if (value >= highThreshold) return "High credibility";
  if (value >= mediumThreshold) return "Moderate credibility";
  return "Low credibility";
}

function normalizeAnalysis(item = {}, index = 0) {
  const label = normalizeResultLabel(item.label || item.prediction);
  const confidence = Math.min(100, Math.max(0, Math.round(Number(item.confidence ?? Number(item.confidenceScore || 0) * 100) || 0)));
  const confidenceScore = clampConfidence(item.confidenceScore ?? confidence / 100);
  const trustScore = Number(item.trustScore || item.credibilityScore || item.credibility?.score || 0) || 0;
  const sourceReputation = item.sourceReputation || getSourceReputation(item.url || item.source);

  return {
    ...item,
    id: item.id || `AN-${Date.now()}-${index + 1}`,
    title: String(item.title || "Untitled Article").trim(),
    source: String(item.source || "Manual input").trim(),
    url: String(item.url || "").trim(),
    label,
    prediction: label,
    confidence,
    confidenceScore,
    model: String(item.model || "Unknown model").trim(),
    date: String(item.date || item.analyzed_at || formatDateTime()).replace("T", " ").slice(0, 16),
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
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    keywordMetadata: item.keywordMetadata || item.nlpMetadata?.keywordExtraction || null,
    influentialKeywords: Array.isArray(item.influentialKeywords) ? item.influentialKeywords : [],
    probabilities: item.probabilities || null,
    modelProbabilities: item.modelProbabilities || null,
    binaryModelProbabilities: item.binaryModelProbabilities || null,
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
      version: 3,
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
    users: (database.users?.length ? database.users : starterUsers).map(normalizeUser),
    notifications: (database.notifications?.length ? database.notifications : starterNotifications).map(normalizeNotification),
  };
}

async function readMysqlDatabase() {
  const [articles, analyses, users, notifications] = await Promise.all([
    historyRepository.listArticles({ limit: 3000 }),
    analysisRepository.list({ limit: 500 }),
    userRepository.list(),
    historyRepository.listNotifications({ limit: 20 }),
  ]);

  return normalizeDatabase({
    meta: {
      name: "Fake News Detection MySQL Database",
      version: 3,
      lastAnalysisAt: analyses[0]?.date || null,
    },
    articles,
    analyses,
    users,
    notifications,
  });
}

export async function readDatabase() {
  if (isDatabaseEnabled()) {
    return readMysqlDatabase();
  }

  const database = await readJsonDatabase(createEmptyDatabase);
  return normalizeDatabase(database);
}

export async function writeDatabase(database) {
  if (isDatabaseEnabled()) {
    return;
  }

  await writeJsonDatabase(normalizeDatabase(database));
}

export async function saveAnalysis(item, notification) {
  const analysis = normalizeAnalysis(item);
  const normalizedNotification = normalizeNotification(notification);

  if (!isDatabaseEnabled()) {
    const database = await readDatabase();
    database.meta.lastAnalysisAt = analysis.date;
    database.analyses.unshift(analysis);
    database.analyses = database.analyses.slice(0, 500);
    database.notifications.unshift(normalizedNotification);
    database.notifications = database.notifications.slice(0, 20);
    await writeDatabase(database);
    return analysis;
  }

  await analysisRepository.save(analysis);
  await historyRepository.addNotification(normalizedNotification);
  return analysis;
}

export async function updateUserByEmail(email, updates = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  if (!isDatabaseEnabled()) {
    const database = await readDatabase();
    const index = database.users.findIndex((user) => user.email.toLowerCase() === normalizedEmail);

    if (index === -1) return null;

    const current = database.users[index];
    const next = normalizeUser({
      ...current,
      ...updates,
      email: current.email,
      passwordHash: current.passwordHash,
    });

    database.users[index] = next;
    await writeDatabase(database);
    return next;
  }

  return userRepository.updateByEmail(normalizedEmail, updates);
}

export async function deleteAnalysisById(analysisId) {
  const normalizedId = String(analysisId || "").trim();

  if (!normalizedId) {
    return false;
  }

  if (!isDatabaseEnabled()) {
    const database = await readDatabase();
    const nextAnalyses = database.analyses.filter((item) => item.id !== normalizedId);

    if (nextAnalyses.length === database.analyses.length) return false;

    database.analyses = nextAnalyses;
    database.meta.lastAnalysisAt = nextAnalyses[0]?.date || null;
    await writeDatabase(database);
    return true;
  }

  return analysisRepository.deleteById(normalizedId);
}

export async function deleteArticleById(articleId) {
  const normalizedId = String(articleId || "").trim();

  if (!normalizedId) {
    return false;
  }

  if (!isDatabaseEnabled()) {
    const database = await readDatabase();
    const nextArticles = database.articles.filter((item) => item.id !== normalizedId);

    if (nextArticles.length === database.articles.length) return false;

    database.articles = nextArticles;
    await writeDatabase(database);
    return true;
  }

  return historyRepository.deleteArticleById(normalizedId);
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  if (isDatabaseEnabled()) {
    const user = await userRepository.findByEmail(normalizedEmail);
    return user ? normalizeUser(user) : null;
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

export async function ensureDatabaseSchema() {
  if (!isDatabaseEnabled()) {
    return;
  }

  const schemaPath = path.resolve("backend", "database", "schema.sql");
  const schema = (await readFile(schemaPath, "utf8")).replaceAll("`fake_news_ai`", `\`${process.env.DB_NAME || "fake_news_ai"}\``);
  const connection = await mysql.createConnection(getDatabaseConfig({ includeDatabase: false }));

  try {
    await connection.query(schema);
  } finally {
    await connection.end();
  }

  await getPool().query("SELECT 1");
}
