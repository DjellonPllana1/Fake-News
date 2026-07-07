const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
  "will",
  "would",
  "about",
  "after",
  "before",
  "been",
  "being",
  "over",
  "under",
  "your",
  "they",
  "them",
  "than",
  "then",
  "there",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "how",
]);

export function normalizeWhitespace(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function removeUrls(value = "") {
  return String(value || "").replace(/https?:\/\/\S+/gi, " ");
}

export function decodeHtmlEntities(value = "") {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

export function stripHtml(html = "") {
  return normalizeWhitespace(
    decodeHtmlEntities(
      String(html || "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

export function buildHeadlineFromText(text = "") {
  const cleaned = normalizeWhitespace(text);

  if (!cleaned) {
    return "Untitled Article";
  }

  const sentence = cleaned.split(/[.!?]/)[0] || cleaned;
  return sentence.slice(0, 120).trim();
}

export function splitSentences(text = "") {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function buildExtractiveSummary({ headline = "", text = "" }, maxSentences = 3) {
  const sentences = splitSentences(text).filter((sentence) => sentence.length > 35);

  if (!sentences.length) {
    const fallback = normalizeWhitespace(`${headline}. ${text}`).slice(0, 280);
    return fallback || "No summary available.";
  }

  const selected = sentences.slice(0, maxSentences).join(" ");
  return normalizeWhitespace(selected).slice(0, 420);
}

export function extractKeywordCandidates(text = "", limit = 8) {
  const cleaned = normalizeWhitespace(removeUrls(text).toLowerCase()).replace(/[^a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  const counts = new Map();
  const firstSeen = new Map();

  words.forEach((word, index) => {
    if (word.length < 4 || STOPWORDS.has(word) || /^\d+$/.test(word)) {
      return;
    }

    counts.set(word, (counts.get(word) || 0) + 1);

    if (!firstSeen.has(word)) {
      firstSeen.set(word, index);
    }
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || firstSeen.get(a[0]) - firstSeen.get(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}
