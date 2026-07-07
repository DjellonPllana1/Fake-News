import { readDatabase } from "../../database.js";
import { buildExtractiveSummary, extractKeywordCandidates, normalizeWhitespace, removeUrls, splitSentences } from "../../utils/text.js";

const TRUSTED_LOCAL_SOURCES = new Set(["Reuters dataset"]);
const CONTRADICTION_PHRASES = [
  "no evidence",
  "false claim",
  "false claims",
  "not true",
  "unfounded",
  "misleading",
  "debunked",
  "denied",
  "deny",
  "refuted",
  "hoax",
];
const SUPPORT_PHRASES = [
  "confirmed",
  "announced",
  "reported",
  "according to",
  "officials said",
  "statement said",
  "evidence shows",
];

function normalizeForSimilarity(value = "") {
  return normalizeWhitespace(removeUrls(String(value || "").toLowerCase()).replace(/[^a-z0-9\s]/g, " "));
}

function tokenize(value = "") {
  return normalizeForSimilarity(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function setSimilarity(leftTokens = [], rightTokens = []) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);

  if (!left.size || !right.size) {
    return 0;
  }

  let intersection = 0;

  left.forEach((token) => {
    if (right.has(token)) {
      intersection += 1;
    }
  });

  return intersection / (left.size + right.size - intersection || 1);
}

function countPhraseHits(text = "", phrases = []) {
  const lower = String(text || "").toLowerCase();
  return phrases.reduce((count, phrase) => count + (lower.includes(phrase) ? 1 : 0), 0);
}

function classifyStance(queryText = "", candidateText = "", similarity = {}) {
  const queryContradictionHits = countPhraseHits(queryText, CONTRADICTION_PHRASES);
  const candidateContradictionHits = countPhraseHits(candidateText, CONTRADICTION_PHRASES);
  const candidateSupportHits = countPhraseHits(candidateText, SUPPORT_PHRASES);
  const strongSemanticMatch = Number(similarity.claimSimilarity || 0) >= 0.38 || Number(similarity.titleSimilarity || 0) >= 0.72;

  if (candidateContradictionHits > candidateSupportHits && queryContradictionHits === 0) {
    return "CONTRADICT";
  }

  if (queryContradictionHits > 0 && candidateSupportHits > candidateContradictionHits) {
    return "CONTRADICT";
  }

  if (candidateSupportHits > candidateContradictionHits) {
    return "SUPPORT";
  }

  if (strongSemanticMatch && candidateContradictionHits === 0) {
    return "SUPPORT";
  }

  return "RELATED";
}

function bestMatchingSnippet(claims = [], articleText = "") {
  const candidateSentences = splitSentences(articleText).filter((sentence) => sentence.length >= 45).slice(0, 12);

  if (!candidateSentences.length) {
    return normalizeWhitespace(articleText).slice(0, 220);
  }

  const scored = candidateSentences.map((sentence) => ({
    sentence,
    score: Math.max(
      ...claims.map((claim) => setSimilarity(tokenize(claim), tokenize(sentence))),
      0
    ),
  }));

  return scored.sort((left, right) => right.score - left.score)[0]?.sentence || candidateSentences[0];
}

function scoreCandidateArticle(article, context) {
  const queryText = [context.title, ...context.claims].filter(Boolean).join(" ");
  const titleSimilarity = setSimilarity(tokenize(context.title), tokenize(article.title));
  const claimSimilarity = Math.max(
    ...context.claims.map((claim) => setSimilarity(tokenize(claim), tokenize(`${article.title} ${article.text.slice(0, 900)}`))),
    0
  );
  const queryKeywords = new Set(context.keywords);
  const articleKeywords = extractKeywordCandidates(`${article.title} ${article.text}`, 12);
  const keywordOverlap = queryKeywords.size
    ? articleKeywords.filter((keyword) => queryKeywords.has(keyword)).length / queryKeywords.size
    : 0;
  const similarityScore = Number((titleSimilarity * 0.32 + claimSimilarity * 0.48 + keywordOverlap * 0.2).toFixed(4));

  return {
    article,
    similarityScore,
    stance: classifyStance(queryText, `${article.title} ${article.text.slice(0, 900)}`, {
      titleSimilarity,
      claimSimilarity,
    }),
    summary: buildExtractiveSummary({ headline: article.title, text: article.text }, 2),
    snippet: bestMatchingSnippet(context.claims, article.text),
  };
}

export const localTrustedCorpusProvider = {
  id: "local_trusted_corpus",
  name: "Local Trusted Corpus",
  async searchSimilarArticles(context) {
    const database = await readDatabase();
    const trustedArticles = database.articles.filter(
      (article) => article.label === "REAL" && TRUSTED_LOCAL_SOURCES.has(article.source)
    );
    const ranked = trustedArticles
      .map((article) => scoreCandidateArticle(article, context))
      .filter((item) => item.similarityScore >= Number(process.env.EVIDENCE_MATCH_THRESHOLD || 0.16))
      .sort((left, right) => right.similarityScore - left.similarityScore)
      .slice(0, Number(process.env.EVIDENCE_PROVIDER_LIMIT || 8));

    return ranked.map((item) => ({
      providerId: "local_trusted_corpus",
      providerName: "Local Trusted Corpus",
      source: item.article.source,
      title: item.article.title,
      publishedAt: item.article.date || "",
      similarityScore: item.similarityScore,
      stance: item.stance,
      summary: item.summary,
      snippet: item.snippet,
    }));
  },
};
