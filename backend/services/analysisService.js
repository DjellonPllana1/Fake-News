import { readDatabase, saveAnalysis, toAnalysisRow } from "../database.js";
import { AppError } from "../utils/appError.js";
import { formatDateTime } from "../utils/date.js";
import { getRiskLevel, normalizeResultLabel } from "../utils/labels.js";
import { buildHeadlineFromText, buildExtractiveSummary } from "../utils/text.js";
import { fetchArticleFromUrl, getHostname, isHttpUrl, looksLikeScriptText } from "./articleFetchService.js";
import { applyEvidenceToCredibility, verifyArticleEvidence } from "./evidenceVerificationService.js";
import { predictArticle } from "./modelService.js";
import { getSourceReputation } from "./sourceReputationService.js";
import { analyzeArticleIntelligence } from "./textIntelligenceService.js";
import { buildTrustScore } from "./trustScoreService.js";

function buildAnalysisId() {
  return `AN-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function buildNotification(item) {
  return {
    id: Date.now(),
    title: "Article analyzed",
    text: `${item.label} result saved for "${item.title.slice(0, 80)}" at ${item.confidence}% confidence.`,
    time: "Just now",
    unread: true,
  };
}

export async function fetchArticlePreview(url) {
  const article = await fetchArticleFromUrl(url);
  const sourceReputation = getSourceReputation(article.url || article.source);
  return {
    article: {
      ...article,
      sourceHost: getHostname(article.url || article.source),
      sourceReputation,
      summary: buildExtractiveSummary({ headline: article.title, text: article.text }),
    },
  };
}

export async function analyzeArticle(payload) {
  const resolvedUrl = payload.url || (isHttpUrl(payload.source) ? payload.source : "");
  let finalHeadline = payload.headline;
  let finalText = payload.text;
  let finalSource = payload.source || "Manual input";
  let finalAuthor = payload.author || "";
  let finalPublishedAt = payload.publishedAt || "";
  let fetchWarning = "";

  if (resolvedUrl && (!finalText || finalText.length < 180)) {
    const fetched = await fetchArticleFromUrl(resolvedUrl);
    finalHeadline = finalHeadline || fetched.title;
    finalText = finalText || fetched.text;
    finalSource = fetched.source || finalSource;
    finalAuthor = finalAuthor || fetched.author || "";
    finalPublishedAt = finalPublishedAt || fetched.publishedAt || "";
    fetchWarning = fetched.warning || "";
  }

  if (!finalText || finalText.trim().length < 40) {
    throw new AppError("There is not enough readable article text to analyze.", 422, "ARTICLE_TEXT_REQUIRED");
  }

  if (looksLikeScriptText(finalText)) {
    throw new AppError(
      "The submitted text looks like webpage script or boilerplate instead of article content. Paste the readable article text or use a direct article URL.",
      422,
      "ARTICLE_TEXT_INVALID"
    );
  }

  const prediction = await predictArticle({
    headline: finalHeadline,
    text: finalText,
    source: finalSource,
    url: resolvedUrl,
  });
  const intelligence = analyzeArticleIntelligence({
    headline: finalHeadline,
    text: finalText,
    source: finalSource,
    url: resolvedUrl,
    author: finalAuthor,
    publishedAt: finalPublishedAt,
    mlResult: prediction,
  });
  const evidence = await verifyArticleEvidence({
    headline: finalHeadline,
    text: finalText,
    source: finalSource,
    url: resolvedUrl,
  });
  const evidenceAdjusted = applyEvidenceToCredibility({
    baseCredibilityScore: intelligence.credibilityScore,
    currentLabel: intelligence.label,
    evidenceReport: evidence,
  });
  const trustScore = buildTrustScore({
    headline: finalHeadline,
    text: finalText,
    source: finalSource,
    url: resolvedUrl,
    author: finalAuthor,
    publishedAt: finalPublishedAt,
    prediction,
    intelligence,
    evidence,
  });
  const sourceReputation = getSourceReputation(resolvedUrl || finalSource);
  const finalLabel = normalizeResultLabel(evidenceAdjusted.label);
  const finalExplanation = [
    intelligence.explanation,
    evidence.hasEvidence
      ? `Claim-level verification found ${evidence.supportedClaimsCount} supported, ${evidence.contradictedClaimsCount} contradicted, and ${evidence.unverifiedClaimsCount} unverified claims with ${Math.round(
          evidence.evidenceConfidence * 100
        )}% evidence confidence.`
      : evidence.message,
  ]
    .filter(Boolean)
    .join(" ");
  const finalRecommendation = evidence.hasEvidence
    ? `${intelligence.recommendation} Review the evidence report before sharing the article.`
    : `${intelligence.recommendation} Unable to verify this claim with trusted-source evidence, so manual review is recommended.`;

  const analysis = {
    id: buildAnalysisId(),
    title: finalHeadline || buildHeadlineFromText(finalText),
    source: finalSource,
    url: resolvedUrl,
    label: finalLabel,
    prediction: finalLabel,
    confidence: intelligence.confidence,
    confidenceScore: intelligence.confidenceScore,
    credibilityScore: trustScore.trustScore,
    baseCredibilityScore: intelligence.credibilityScore,
    evidenceAdjustedCredibilityScore: evidenceAdjusted.credibilityScore,
    trustScore: trustScore.trustScore,
    trustLevel: trustScore.trustLevel,
    trustExplanation: trustScore.trustExplanation,
    trustReasons: trustScore.trustReasons,
    trustSignals: trustScore.trustSignals,
    trustWeights: trustScore.trustWeights,
    sourceReputation,
    model: prediction.model,
    modelVersion: prediction.modelVersion || "",
    modelGeneratedAt: prediction.modelGeneratedAt || prediction.generatedAt || "",
    date: formatDateTime(),
    language: intelligence.language || payload.language || "English",
    languageInfo: intelligence.languageInfo,
    riskLevel: getRiskLevel(finalLabel, intelligence.confidenceScore),
    explanation: finalExplanation,
    recommendation: finalRecommendation,
    summary: intelligence.summary,
    keywords: intelligence.keywords,
    keywordMetadata: intelligence.keywordMetadata,
    influentialKeywords: intelligence.influentialKeywords,
    probabilities: intelligence.probabilities,
    modelProbabilities: intelligence.modelProbabilities,
    binaryModelProbabilities: intelligence.binaryModelProbabilities,
    suspiciousSentences: intelligence.suspiciousSentences,
    ruleFindings: intelligence.ruleFindings,
    sentiment: intelligence.sentiment,
    entities: intelligence.entities,
    topicDetection: intelligence.topicDetection,
    articleCategory: intelligence.articleCategory,
    readingComplexity: intelligence.readingComplexity,
    writingStyle: intelligence.writingStyle,
    emotion: intelligence.emotion,
    nlpMetadata: intelligence.nlpMetadata,
    articleStats: intelligence.articleStats,
    credibility: intelligence.credibility,
    evidence,
    claimAnalyses: evidence.claimAnalyses,
    mainClaims: evidence.mainClaims,
    trustedSourcesFound: evidence.trustedSourcesFound,
    supportingArticlesCount: evidence.supportingArticlesCount,
    contradictingArticlesCount: evidence.contradictingArticlesCount,
    supportedClaimsCount: evidence.supportedClaimsCount,
    contradictedClaimsCount: evidence.contradictedClaimsCount,
    unverifiedClaimsCount: evidence.unverifiedClaimsCount,
    similarityScore: evidence.similarityScore,
    evidenceConfidence: evidence.evidenceConfidence,
    evidenceVerdict: evidence.evidenceVerdict,
    author: finalAuthor,
    publishedAt: finalPublishedAt,
    warning: [prediction.warning, fetchWarning].filter(Boolean).join(" ").trim(),
    articleText: finalText,
    textPreview: finalText.slice(0, 320),
  };

  if (payload.save !== false) {
    await saveAnalysis(analysis, buildNotification(analysis));
  }

  return {
    analysis,
    article: {
      headline: finalHeadline || analysis.title,
      text: finalText,
      source: finalSource,
      url: resolvedUrl,
      summary: intelligence.summary,
      author: finalAuthor,
      publishedAt: finalPublishedAt,
      sourceReputation,
    },
  };
}

export async function getAnalysisHistory({ search = "", label = "", limit = 50 } = {}) {
  const database = await readDatabase();
  const filtered = database.analyses
    .map(toAnalysisRow)
    .filter((item) => !label || normalizeResultLabel(item.label) === normalizeResultLabel(label))
    .filter((item) => {
      if (!search) {
        return true;
      }

      const entityText = Object.values(item.entities || {})
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .join(" ");
      const evidenceText = `${item.mainClaims?.join(" ") || ""} ${item.trustedSourcesFound?.join(" ") || ""} ${
        item.evidence?.sources?.map((sourceItem) => `${sourceItem.title} ${sourceItem.summary}`).join(" ") || ""
      } ${item.claimAnalyses?.map((claim) => `${claim.claim} ${claim.explanation}`).join(" ") || ""}`;
      const trustText = `${item.trustLevel || ""} ${item.trustExplanation || ""} ${(item.trustReasons || []).join(" ")} ${
        item.trustSignals?.map((signal) => `${signal.title} ${signal.evidence} ${signal.positiveReason} ${signal.cautionReason}`).join(" ") || ""
      }`;
      const sourceReputationText = `${item.sourceReputation?.domain || ""} ${item.sourceReputation?.badge || ""} ${
        item.sourceReputation?.politicalBias || ""
      } ${item.sourceReputation?.country || ""} ${item.sourceReputation?.reliability || ""} ${item.sourceReputation?.factCheckingHistory || ""}`;
      const topicText = `${item.topicDetection?.primary?.label || ""} ${(item.topicDetection?.secondary || []).map((topic) => topic.label).join(" ")} ${
        item.articleCategory?.label || ""
      } ${item.articleCategory?.rationale || ""}`;
      const languageText = `${item.language || ""} ${item.languageInfo?.name || ""} ${item.languageInfo?.code || ""}`;
      const readabilityText = `${item.readingComplexity?.level || ""} ${item.readingComplexity?.fleschReadingEase || ""} ${
        item.readingComplexity?.fleschKincaidGrade || ""
      } ${item.writingStyle?.label || ""} ${(item.writingStyle?.indicators || []).join(" ")} ${item.emotion?.dominant || ""} ${item.emotion?.secondary || ""} ${
        item.emotion?.summary || ""
      }`;
      const keywordMetadataText = `${item.keywordMetadata?.keywords?.join(" ") || ""} ${item.keywordMetadata?.keyPhrases?.join(" ") || ""} ${
        item.keywordMetadata?.items?.map((entry) => entry.term).join(" ") || ""
      }`;
      const haystack =
        `${item.title} ${item.source} ${item.summary} ${item.explanation} ${item.recommendation} ${item.keywords.join(" ")} ${entityText} ${evidenceText} ${trustText} ${sourceReputationText} ${topicText} ${languageText} ${readabilityText} ${keywordMetadataText}`.toLowerCase();
      return haystack.includes(search);
    })
    .slice(0, limit);

  return {
    history: filtered,
    total: filtered.length,
  };
}

export async function getDatasetArticles({ search = "", label = "", limit = 25 } = {}) {
  const database = await readDatabase();
  const articles = database.articles
    .filter((article) => !label || normalizeResultLabel(article.label) === normalizeResultLabel(label))
    .filter((article) => {
      if (!search) {
        return true;
      }

      return `${article.title} ${article.subject} ${article.text}`.toLowerCase().includes(search);
    })
    .slice(0, limit)
    .map((article) => ({
      ...article,
      preview: article.text.slice(0, 180),
      summary: buildExtractiveSummary({ headline: article.title, text: article.text }),
    }));

  return {
    articles,
    total: articles.length,
  };
}
