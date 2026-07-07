import { clampConfidence } from "../utils/labels.js";
import { normalizeWhitespace, splitSentences } from "../utils/text.js";
import { getHostname } from "./articleFetchService.js";
import { getSourceReputation, isTrustedSource } from "./sourceReputationService.js";

const DEFAULT_WEIGHTS = {
  mlProbability: 1.6,
  clickbaitDetection: 0.9,
  domainReputation: 1.1,
  writingQuality: 1.0,
  sensationalLanguage: 1.0,
  emotionalLanguage: 0.7,
  authorPresence: 0.5,
  publicationDate: 0.5,
  articleLength: 0.6,
  sourceReliability: 1.2,
};

function parseWeight(name, fallback) {
  const raw = process.env[name];

  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseThreshold(name, fallback) {
  const parsed = Number(process.env[name] || fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampUnit(value) {
  return clampConfidence(value);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function countWords(text = "") {
  return normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
}

function uniqueWordRatio(text = "") {
  const words = normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);

  if (!words.length) {
    return 0;
  }

  return new Set(words).size / words.length;
}

function closenessScore(value, optimal, tolerance) {
  return clampUnit(1 - Math.abs(value - optimal) / tolerance);
}

function getRuleScore(ruleFindings = [], id) {
  return Number(ruleFindings.find((item) => item.id === id)?.score || 0);
}

function buildSignal({ key, title, score, weight, positiveReason, cautionReason, evidence }) {
  const normalizedScore = clampScore(score);

  return {
    key,
    title,
    score: normalizedScore,
    weight,
    evidence,
    positiveReason,
    cautionReason,
  };
}

function evaluateWritingQuality({ text = "", suspiciousSentences = [] }) {
  const normalizedText = normalizeWhitespace(text);
  const wordCount = countWords(normalizedText);
  const sentenceCount = Math.max(splitSentences(normalizedText).length, 1);
  const avgSentenceLength = wordCount / sentenceCount;
  const diversityRatio = uniqueWordRatio(normalizedText);
  const uppercaseRatio =
    (normalizedText.match(/[A-Z]/g) || []).length / Math.max((normalizedText.match(/[A-Za-z]/g) || []).length, 1);
  const punctuationBursts = (normalizedText.match(/[!?]{2,}/g) || []).length;

  const sentenceLengthScore = closenessScore(avgSentenceLength, 22, 18);
  const structureScore = sentenceCount >= 4 ? 1 : sentenceCount === 3 ? 0.82 : sentenceCount === 2 ? 0.58 : 0.35;
  const diversityScore = clampUnit((diversityRatio - 0.28) / 0.3);
  const calmnessPenalty = Math.min(punctuationBursts * 0.18 + uppercaseRatio * 1.7 + suspiciousSentences.length * 0.12, 1);
  const calmnessScore = 1 - calmnessPenalty;
  const score = clampUnit(sentenceLengthScore * 0.35 + structureScore * 0.2 + diversityScore * 0.2 + calmnessScore * 0.25);

  return {
    score,
    evidence: `${wordCount} words, ${sentenceCount} sentences, avg sentence length ${avgSentenceLength.toFixed(1)} words`,
  };
}

function evaluateArticleLength(wordCount = 0) {
  if (wordCount >= 220 && wordCount <= 1800) {
    return 1;
  }

  if (wordCount >= 160 && wordCount < 220) {
    return 0.78;
  }

  if (wordCount >= 90 && wordCount < 160) {
    return 0.5;
  }

  if (wordCount > 1800 && wordCount <= 2600) {
    return 0.72;
  }

  if (wordCount > 2600) {
    return 0.58;
  }

  return 0.28;
}

function evaluateDomainReputation({ source = "", url = "", ruleFindings = [] }) {
  const sourceValue = url || source;
  const hostname = getHostname(sourceValue);
  const suspiciousDomainScore = getRuleScore(ruleFindings, "suspicious_domain");
  const sourceReputation = getSourceReputation(sourceValue);

  if (sourceReputation.known) {
    return {
      score: sourceReputation.trustScore / 100,
      evidence: `${sourceReputation.domain} | ${sourceReputation.politicalBias} | ${sourceReputation.country} | ${sourceReputation.reliability}`,
      reason:
        sourceReputation.badge === "Trusted"
          ? "Reliable domain"
          : sourceReputation.badge === "Medium"
            ? "Domain has mixed but known reputation signals"
            : "The domain appears in the suspicious-source registry",
      caution:
        sourceReputation.badge === "Suspicious"
          ? "The domain is listed as suspicious in the source reputation registry."
          : sourceReputation.badge === "Medium"
            ? "The domain has mixed or medium reputation signals."
            : "Domain reputation is not strong enough to build high trust.",
    };
  }

  if (hostname && suspiciousDomainScore >= 0.72) {
    return {
      score: 0.16,
      evidence: hostname,
      reason: "Domain reputation looks acceptable.",
      caution: "The domain looks suspicious or low-reputation.",
    };
  }

  if (hostname) {
    return {
      score: 0.56,
      evidence: hostname,
      reason: "Domain reputation is acceptable.",
      caution: "The domain is not clearly established as reliable.",
    };
  }

  return {
    score: 0.38,
    evidence: "No source domain provided",
    reason: "Source domain is present.",
    caution: "No clear domain reputation signal is available.",
  };
}

function evaluateSourceReliability({ source = "", url = "", evidence = {} }) {
  const sourceValue = url || source;
  const sourceReputation = getSourceReputation(sourceValue);
  const trustedDomain = isTrustedSource(sourceValue);
  const totalClaims = Math.max(
    Number(evidence.supportedClaimsCount || 0) + Number(evidence.contradictedClaimsCount || 0) + Number(evidence.unverifiedClaimsCount || 0),
    1
  );
  const supportRatio = Number(evidence.supportedClaimsCount || 0) / totalClaims;
  const contradictionRatio = Number(evidence.contradictedClaimsCount || 0) / totalClaims;
  const trustedSourceCount = Array.isArray(evidence.trustedSourcesFound) ? evidence.trustedSourcesFound.length : 0;
  const reputationBase = sourceReputation.known ? sourceReputation.trustScore / 100 : trustedDomain ? 0.7 : 0.45;
  const score = clampUnit(
    reputationBase * 0.62 +
      supportRatio * 0.22 +
      Math.min(trustedSourceCount * 0.08, 0.18) +
      Number(evidence.evidenceConfidence || 0) * 0.18 -
      contradictionRatio * 0.35
  );

  return {
    score,
    evidence: sourceReputation.known
      ? `${sourceReputation.reliability} reliability | ${trustedSourceCount} trusted source${trustedSourceCount === 1 ? "" : "s"} found`
      : trustedSourceCount
        ? `${trustedSourceCount} trusted source${trustedSourceCount === 1 ? "" : "s"} found`
        : "No trusted-source confirmation found",
    reason:
      sourceReputation.badge === "Trusted" && trustedSourceCount > 1 && supportRatio >= contradictionRatio
        ? "Reliable domain with multiple trusted sources"
        : trustedSourceCount > 1 && supportRatio >= contradictionRatio
        ? "Multiple trusted sources support the article"
        : trustedSourceCount >= 1 && supportRatio >= contradictionRatio
          ? "Trusted source support is available"
          : sourceReputation.badge === "Trusted"
            ? "Reliable domain"
            : sourceReputation.badge === "Medium"
              ? "Source reliability is mixed"
              : sourceReputation.badge === "Suspicious"
                ? "The source has a weak reliability record"
          : "Source reliability is acceptable",
    caution:
      sourceReputation.badge === "Suspicious"
        ? "The source appears in the suspicious-source registry and should be verified carefully."
        : contradictionRatio > supportRatio
        ? "Trusted-source support is contradicted by other reporting."
        : trustedSourceCount === 0
          ? "Trusted-source support is weak or unavailable."
          : "Trusted-source support is limited.",
  };
}

function trustLevelFromScore(score) {
  const highThreshold = parseThreshold("TRUST_SCORE_HIGH_THRESHOLD", 75);
  const mediumThreshold = parseThreshold("TRUST_SCORE_MEDIUM_THRESHOLD", 55);

  if (score >= highThreshold) {
    return "High credibility";
  }

  if (score >= mediumThreshold) {
    return "Moderate credibility";
  }

  return "Low credibility";
}

function buildReasonSummary({ score, signals }) {
  const positives = signals
    .filter((signal) => signal.score >= 70)
    .sort((left, right) => right.weight * right.score - left.weight * left.score)
    .map((signal) => signal.positiveReason);
  const cautions = signals
    .filter((signal) => signal.score < 50)
    .sort((left, right) => right.weight * (100 - right.score) - left.weight * (100 - left.score))
    .map((signal) => signal.cautionReason);

  let reasons = [];

  if (score >= 75) {
    reasons = positives.slice(0, 4);
  } else if (score <= 45) {
    reasons = cautions.slice(0, 4);
  } else {
    reasons = [...positives.slice(0, 2), ...cautions.slice(0, 2)];
  }

  if (!reasons.length) {
    reasons = [...positives.slice(0, 2), ...cautions.slice(0, 2)];
  }

  return reasons.filter(Boolean).slice(0, 4);
}

export function buildTrustScore({
  headline = "",
  text = "",
  source = "",
  url = "",
  author = "",
  publishedAt = "",
  prediction = {},
  intelligence = {},
  evidence = {},
}) {
  const weights = {
    mlProbability: parseWeight("TRUST_WEIGHT_ML_PROBABILITY", DEFAULT_WEIGHTS.mlProbability),
    clickbaitDetection: parseWeight("TRUST_WEIGHT_CLICKBAIT_DETECTION", DEFAULT_WEIGHTS.clickbaitDetection),
    domainReputation: parseWeight("TRUST_WEIGHT_DOMAIN_REPUTATION", DEFAULT_WEIGHTS.domainReputation),
    writingQuality: parseWeight("TRUST_WEIGHT_WRITING_QUALITY", DEFAULT_WEIGHTS.writingQuality),
    sensationalLanguage: parseWeight("TRUST_WEIGHT_SENSATIONAL_LANGUAGE", DEFAULT_WEIGHTS.sensationalLanguage),
    emotionalLanguage: parseWeight("TRUST_WEIGHT_EMOTIONAL_LANGUAGE", DEFAULT_WEIGHTS.emotionalLanguage),
    authorPresence: parseWeight("TRUST_WEIGHT_AUTHOR_PRESENCE", DEFAULT_WEIGHTS.authorPresence),
    publicationDate: parseWeight("TRUST_WEIGHT_PUBLICATION_DATE", DEFAULT_WEIGHTS.publicationDate),
    articleLength: parseWeight("TRUST_WEIGHT_ARTICLE_LENGTH", DEFAULT_WEIGHTS.articleLength),
    sourceReliability: parseWeight("TRUST_WEIGHT_SOURCE_RELIABILITY", DEFAULT_WEIGHTS.sourceReliability),
  };

  const ruleFindings = intelligence.ruleFindings || [];
  const ruleScores = {
    clickbait: getRuleScore(ruleFindings, "clickbait_title"),
    sensational: getRuleScore(ruleFindings, "sensational_phrases"),
    emotional: getRuleScore(ruleFindings, "emotional_language"),
  };
  const wordCount = Number(intelligence.articleStats?.wordCount || countWords(text));
  const writingQuality = evaluateWritingQuality({
    text,
    suspiciousSentences: intelligence.suspiciousSentences || [],
  });
  const domainReputation = evaluateDomainReputation({
    source,
    url,
    ruleFindings,
  });
  const sourceReliability = evaluateSourceReliability({
    source,
    url,
    evidence,
  });
  const modelRealProbability = clampUnit(
    prediction.modelProbabilities?.REAL ??
      intelligence.modelProbabilities?.REAL ??
      (prediction.label === "REAL" ? prediction.confidenceScore || 0.5 : 0.5)
  );
  const signals = [
    buildSignal({
      key: "mlProbability",
      title: "Machine Learning probability",
      score: modelRealProbability * 100,
      weight: weights.mlProbability,
      evidence: `${Math.round(modelRealProbability * 100)}% REAL probability`,
      positiveReason: "The ML model strongly favors a legitimate article pattern",
      cautionReason: "The ML model assigns low credibility to the article language",
    }),
    buildSignal({
      key: "clickbaitDetection",
      title: "Clickbait detection",
      score: (1 - ruleScores.clickbait) * 100,
      weight: weights.clickbaitDetection,
      evidence: headline || "No headline provided",
      positiveReason: "The headline avoids clickbait cues",
      cautionReason: "The headline uses clickbait-style phrasing",
    }),
    buildSignal({
      key: "domainReputation",
      title: "Domain reputation",
      score: domainReputation.score * 100,
      weight: weights.domainReputation,
      evidence: domainReputation.evidence,
      positiveReason: domainReputation.reason,
      cautionReason: domainReputation.caution,
    }),
    buildSignal({
      key: "writingQuality",
      title: "Writing quality",
      score: writingQuality.score * 100,
      weight: weights.writingQuality,
      evidence: writingQuality.evidence,
      positiveReason: "Good writing quality",
      cautionReason: "Writing quality appears weak or inconsistent",
    }),
    buildSignal({
      key: "sensationalLanguage",
      title: "Sensational language",
      score: (1 - ruleScores.sensational) * 100,
      weight: weights.sensationalLanguage,
      evidence: `${Math.round(ruleScores.sensational * 100)}% sensational signal`,
      positiveReason: "Little sensational language detected",
      cautionReason: "Sensational language reduces trust",
    }),
    buildSignal({
      key: "emotionalLanguage",
      title: "Emotional language",
      score: (1 - Math.max(ruleScores.emotional, Number(intelligence.sentiment?.emotionalIntensity || 0))) * 100,
      weight: weights.emotionalLanguage,
      evidence: `${Math.round(Number(intelligence.sentiment?.emotionalIntensity || 0) * 100)}% emotional intensity`,
      positiveReason: "Neutral language",
      cautionReason: "Emotional language reduces credibility",
    }),
    buildSignal({
      key: "authorPresence",
      title: "Author presence",
      score: author ? 100 : 28,
      weight: weights.authorPresence,
      evidence: author || "No author provided",
      positiveReason: "Author information is available",
      cautionReason: "No author is provided",
    }),
    buildSignal({
      key: "publicationDate",
      title: "Publication date",
      score: publishedAt ? 100 : 34,
      weight: weights.publicationDate,
      evidence: publishedAt || "No publication date provided",
      positiveReason: "Publication date is available",
      cautionReason: "Publication date is missing",
    }),
    buildSignal({
      key: "articleLength",
      title: "Article length",
      score: evaluateArticleLength(wordCount) * 100,
      weight: weights.articleLength,
      evidence: `${wordCount} words`,
      positiveReason: "Article length provides enough context",
      cautionReason: "Article length is too short or atypical",
    }),
    buildSignal({
      key: "sourceReliability",
      title: "Source reliability",
      score: sourceReliability.score * 100,
      weight: weights.sourceReliability,
      evidence: sourceReliability.evidence,
      positiveReason: sourceReliability.reason,
      cautionReason: sourceReliability.caution,
    }),
  ];

  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const weightedScore = totalWeight
    ? signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / totalWeight
    : 50;
  const trustScore = clampScore(weightedScore);
  const trustLevel = trustLevelFromScore(trustScore);
  const trustReasons = buildReasonSummary({
    score: trustScore,
    signals,
  });

  return {
    trustScore,
    trustLevel,
    trustExplanation: `Trust Score ${trustScore}/100 indicates ${trustLevel.toLowerCase()}. ${
      trustReasons.length ? `Reasons: ${trustReasons.join("; ")}.` : "No strong trust signals were identified."
    }`,
    trustReasons,
    trustSignals: signals,
    trustWeights: weights,
    sourceHost: getHostname(url || source),
  };
}
