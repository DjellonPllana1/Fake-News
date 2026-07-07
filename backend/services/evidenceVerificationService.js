import { buildHeadlineFromText, extractKeywordCandidates, normalizeWhitespace, splitSentences } from "../utils/text.js";
import { clampConfidence, normalizeResultLabel } from "../utils/labels.js";
import { getEvidenceProviders } from "./evidenceProviders/index.js";

const CLAIM_VERBS = [
  "is",
  "are",
  "was",
  "were",
  "said",
  "says",
  "claim",
  "claims",
  "reported",
  "announced",
  "confirmed",
  "caused",
  "approved",
  "denied",
  "won",
  "lost",
];

const CLAIM_VERDICT_META = {
  SUPPORTED: {
    label: "Supported",
    symbol: "\u2713",
  },
  UNVERIFIED: {
    label: "Unverified",
    symbol: "\u26A0",
  },
  CONTRADICTED: {
    label: "Contradicted",
    symbol: "\u2717",
  },
};

function dedupe(values = [], limit = values.length) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()))].slice(0, limit);
}

function dedupeBy(items = [], buildKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = buildKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function scoreClaimSentence(sentence = "", headlineKeywords = []) {
  const lower = sentence.toLowerCase();
  const overlap = headlineKeywords.filter((keyword) => lower.includes(keyword)).length;
  const verbScore = CLAIM_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(sentence)).length;
  const numberScore = (sentence.match(/\b\d+(?:\.\d+)?\b/g) || []).length;
  const properNounScore = (sentence.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) || []).length;
  const punctuationPenalty = sentence.length > 260 ? 0.1 : 0;
  return overlap * 0.35 + verbScore * 0.25 + numberScore * 0.2 + Math.min(properNounScore, 3) * 0.12 - punctuationPenalty;
}

export function extractMainClaims({ headline = "", text = "" }, limit = 3) {
  const normalizedHeadline = normalizeWhitespace(headline || buildHeadlineFromText(text));
  const headlineKeywords = extractKeywordCandidates(normalizedHeadline, 8);
  const candidateSentences = splitSentences(text)
    .filter((sentence) => sentence.length >= 55 && sentence.length <= 260)
    .map((sentence) => ({
      sentence,
      score: scoreClaimSentence(sentence, headlineKeywords),
    }))
    .filter((item) => item.score > 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.sentence);

  return dedupe([normalizedHeadline, ...candidateSentences], limit);
}

function buildEvidenceConfidence({ averageSimilarity, supportingArticles, contradictingArticles, relatedArticles }) {
  const total = supportingArticles.length + contradictingArticles.length + relatedArticles.length;

  if (!total) {
    return 0;
  }

  const dominantShare = Math.max(supportingArticles.length, contradictingArticles.length, relatedArticles.length) / total;
  return clampConfidence(averageSimilarity * 0.65 + Math.min(total / 4, 1) * 0.2 + dominantShare * 0.15);
}

function buildEvidenceCredibilityScore(evidenceReport = {}) {
  const sourceArticles = Array.isArray(evidenceReport.sources) ? evidenceReport.sources : [];
  const supportStrength = sourceArticles
    .filter((item) => item.stance === "SUPPORT")
    .reduce((sum, item) => sum + Number(item.similarityScore || 0), 0);
  const contradictionStrength = sourceArticles
    .filter((item) => item.stance === "CONTRADICT")
    .reduce((sum, item) => sum + Number(item.similarityScore || 0), 0);
  const relatedStrength =
    sourceArticles.filter((item) => item.stance === "RELATED").reduce((sum, item) => sum + Number(item.similarityScore || 0), 0) * 0.5;
  const totalStrength = supportStrength + contradictionStrength + relatedStrength;

  if (!totalStrength) {
    return 50;
  }

  return Math.round(((supportStrength + relatedStrength) / totalStrength) * 100);
}

function verdictFromEvidence({ supportingArticles, contradictingArticles, relatedArticles, evidenceConfidence }) {
  if (!supportingArticles.length && !contradictingArticles.length && !relatedArticles.length) {
    return "UNVERIFIED";
  }

  if (contradictingArticles.length > supportingArticles.length && evidenceConfidence >= 0.34) {
    return "CONTRADICTED";
  }

  if (supportingArticles.length > contradictingArticles.length && evidenceConfidence >= 0.34) {
    return "SUPPORTED";
  }

  return "UNVERIFIED";
}

function explanationForClaim({ verdict, supportingArticles, contradictingArticles, relatedArticles, evidenceConfidence }) {
  if (verdict === "SUPPORTED") {
    return `Trusted coverage aligns with this claim. ${supportingArticles.length} supporting article(s) were found with ${Math.round(
      evidenceConfidence * 100
    )}% confidence and no stronger contradictory signal.`;
  }

  if (verdict === "CONTRADICTED") {
    return `Trusted reporting challenges this claim. ${contradictingArticles.length} contradicting article(s) outweighed ${supportingArticles.length} supporting article(s), producing ${Math.round(
      evidenceConfidence * 100
    )}% confidence in the contradiction signal.`;
  }

  if (!supportingArticles.length && !contradictingArticles.length && !relatedArticles.length) {
    return "Unable to verify this claim using trusted sources.";
  }

  return `Trusted sources covered related material, but the evidence was not strong enough to clearly support or contradict this claim. Evidence confidence is ${Math.round(
    evidenceConfidence * 100
  )}%.`;
}

function aggregateProviderStatuses(claimAnalyses = []) {
  return dedupeBy(
    claimAnalyses.flatMap((claim) => claim.providersTried || []),
    (item) => `${item.id}::${item.claimIndex ?? ""}`
  ).map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
  }));
}

async function analyzeSingleClaim({ claim, claimIndex, title, source, url, providers }) {
  const keywords = extractKeywordCandidates([title, claim].join(" "), 10);
  const settledResults = await Promise.allSettled(
    providers.map((provider) =>
      provider.searchSimilarArticles({
        title,
        claims: [claim],
        keywords,
        source,
        url,
      })
    )
  );
  const providerResults = settledResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const providerStatuses = settledResults.map((result, index) => ({
    id: providers[index]?.id,
    name: providers[index]?.name,
    status: result.status === "fulfilled" ? "ok" : "failed",
    claimIndex,
  }));
  const evidenceSources = dedupeBy(
    providerResults.flat(),
    (item) => `${item.source}::${item.title}::${item.stance}`.toLowerCase()
  )
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, 5);
  const supportingArticles = evidenceSources.filter((item) => item.stance === "SUPPORT");
  const contradictingArticles = evidenceSources.filter((item) => item.stance === "CONTRADICT");
  const relatedArticles = evidenceSources.filter((item) => item.stance === "RELATED");
  const averageSimilarity = evidenceSources.length
    ? evidenceSources.reduce((sum, item) => sum + Number(item.similarityScore || 0), 0) / evidenceSources.length
    : 0;
  const evidenceConfidence = Number(
    buildEvidenceConfidence({
      averageSimilarity,
      supportingArticles,
      contradictingArticles,
      relatedArticles,
    }).toFixed(4)
  );
  const verdict = verdictFromEvidence({
    supportingArticles,
    contradictingArticles,
    relatedArticles,
    evidenceConfidence,
  });
  const verdictMeta = CLAIM_VERDICT_META[verdict] || CLAIM_VERDICT_META.UNVERIFIED;

  return {
    id: `claim-${claimIndex + 1}`,
    index: claimIndex + 1,
    claim,
    confidenceScore: evidenceConfidence,
    confidence: Math.round(evidenceConfidence * 100),
    similarityScore: Number(averageSimilarity.toFixed(4)),
    evidence: evidenceSources,
    evidenceCount: evidenceSources.length,
    supportingArticlesCount: supportingArticles.length,
    contradictingArticlesCount: contradictingArticles.length,
    relatedArticlesCount: relatedArticles.length,
    trustedSourcesFound: dedupe(evidenceSources.map((item) => item.source), 6),
    explanation: explanationForClaim({
      verdict,
      supportingArticles,
      contradictingArticles,
      relatedArticles,
      evidenceConfidence,
    }),
    verdict,
    finalVerdict: verdictMeta.label,
    verdictSymbol: verdictMeta.symbol,
    providersTried: providerStatuses,
  };
}

export function applyEvidenceToCredibility({ baseCredibilityScore, currentLabel, evidenceReport }) {
  if (!evidenceReport?.hasEvidence) {
    return {
      credibilityScore: baseCredibilityScore,
      label: normalizeResultLabel(currentLabel),
      evidenceWeight: 0,
    };
  }

  const evidenceCredibilityScore = buildEvidenceCredibilityScore(evidenceReport);
  const evidenceWeight = Number((0.18 + clampConfidence(evidenceReport.evidenceConfidence) * 0.32).toFixed(3));
  const credibilityScore = Math.round(baseCredibilityScore * (1 - evidenceWeight) + evidenceCredibilityScore * evidenceWeight);

  return {
    credibilityScore,
    label: normalizeResultLabel(currentLabel),
    evidenceWeight,
    evidenceCredibilityScore,
  };
}

export async function verifyArticleEvidence({ headline = "", text = "", source = "", url = "" }) {
  const title = normalizeWhitespace(headline || buildHeadlineFromText(text));
  const mainClaims = extractMainClaims({ headline: title, text }, 3);
  const providers = getEvidenceProviders();
  const claimAnalyses = await Promise.all(
    mainClaims.map((claim, claimIndex) =>
      analyzeSingleClaim({
        claim,
        claimIndex,
        title,
        source,
        url,
        providers,
      })
    )
  );
  const aggregatedEvidenceMatches = dedupeBy(
    claimAnalyses.flatMap((claim) => claim.evidence || []),
    (item) => `${item.source}::${item.title}::${item.stance}`.toLowerCase()
  );
  const supportingArticles = aggregatedEvidenceMatches.filter((item) => item.stance === "SUPPORT");
  const contradictingArticles = aggregatedEvidenceMatches.filter((item) => item.stance === "CONTRADICT");
  const relatedArticles = aggregatedEvidenceMatches.filter((item) => item.stance === "RELATED");
  const trustedSourcesFound = dedupe(aggregatedEvidenceMatches.map((item) => item.source), 6);
  const averageSimilarity = claimAnalyses.length
    ? claimAnalyses.reduce((sum, item) => sum + Number(item.similarityScore || 0), 0) / claimAnalyses.length
    : 0;
  const evidenceConfidence = claimAnalyses.length
    ? claimAnalyses.reduce((sum, item) => sum + Number(item.confidenceScore || 0), 0) / claimAnalyses.length
    : 0;
  const supportedClaimsCount = claimAnalyses.filter((item) => item.verdict === "SUPPORTED").length;
  const contradictedClaimsCount = claimAnalyses.filter((item) => item.verdict === "CONTRADICTED").length;
  const unverifiedClaimsCount = claimAnalyses.filter((item) => item.verdict === "UNVERIFIED").length;
  const evidenceVerdict =
    contradictedClaimsCount > supportedClaimsCount
      ? "CONTRADICTS"
      : supportedClaimsCount > contradictedClaimsCount
        ? "SUPPORTS"
        : supportedClaimsCount || contradictedClaimsCount
          ? "MIXED"
          : "UNVERIFIED";
  const hasEvidence = claimAnalyses.some((item) => item.evidenceCount > 0);
  const message = hasEvidence ? "" : "Unable to verify this claim using trusted sources.";

  return {
    status: hasEvidence ? "verified" : "unverified",
    hasEvidence,
    title,
    mainClaims,
    claimAnalyses,
    trustedSourcesFound,
    supportingArticlesCount: supportingArticles.length,
    contradictingArticlesCount: contradictingArticles.length,
    relatedArticlesCount: relatedArticles.length,
    supportedClaimsCount,
    contradictedClaimsCount,
    unverifiedClaimsCount,
    similarityScore: Number(averageSimilarity.toFixed(4)),
    evidenceConfidence: Number(evidenceConfidence.toFixed(4)),
    evidenceVerdict,
    message,
    sources: aggregatedEvidenceMatches.slice(0, 8),
    providersTried: aggregateProviderStatuses(claimAnalyses),
  };
}
