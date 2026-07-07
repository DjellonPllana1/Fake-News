import { clampConfidence, getRiskLevel, normalizeResultLabel } from "../utils/labels.js";
import { buildExtractiveSummary, extractKeywordCandidates, normalizeWhitespace, removeUrls, splitSentences } from "../utils/text.js";
import { getHostname } from "./articleFetchService.js";
import { getSourceReputation, isTrustedSource } from "./sourceReputationService.js";

const CLICKBAIT_PATTERNS = [
  /\byou won'?t believe\b/i,
  /\bwhat happened next\b/i,
  /\bshocking\b/i,
  /\bthis is why\b/i,
  /\bbreaking\b/i,
  /\bwatch\b/i,
  /\bsecret\b/i,
  /\bexposed\b/i,
  /\bmust see\b/i,
];

const SENSATIONAL_PATTERNS = [
  /\bhoax\b/i,
  /\bconspiracy\b/i,
  /\bmiracle\b/i,
  /\bcover[- ]?up\b/i,
  /\bexplosive\b/i,
  /\bcensored\b/i,
  /\bguaranteed\b/i,
  /\bunbelievable\b/i,
  /\bpanic\b/i,
  /\btraitor\b/i,
];

const EMOTIONAL_WORDS = [
  "outrage",
  "terrifying",
  "horrific",
  "furious",
  "fear",
  "angry",
  "hate",
  "disaster",
  "devastating",
  "chaos",
  "crisis",
  "betrayal",
  "urgent",
  "warning",
];

const POSITIVE_WORDS = [
  "verified",
  "confirmed",
  "official",
  "credible",
  "evidence",
  "stable",
  "accurate",
  "improved",
  "clear",
  "valid",
];

const NEGATIVE_WORDS = [
  "fraud",
  "lie",
  "fake",
  "scam",
  "corrupt",
  "manipulated",
  "danger",
  "threat",
  "false",
  "misleading",
];

const ORGANIZATION_SUFFIXES = [
  "Inc",
  "Corp",
  "Corporation",
  "University",
  "Agency",
  "Department",
  "Ministry",
  "Committee",
  "Council",
  "Bank",
  "Institute",
  "Office",
  "Commission",
  "Senate",
  "House",
  "Court",
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const LANGUAGE_PROFILES = [
  { code: "en", name: "English", markers: ["the", "and", "of", "to", "in", "that", "with", "for", "on", "said", "from"] },
  { code: "es", name: "Spanish", markers: ["de", "la", "que", "el", "en", "y", "los", "del", "se", "las", "por"] },
  { code: "fr", name: "French", markers: ["de", "la", "le", "les", "des", "dans", "pour", "avec", "est", "sur", "une"] },
  { code: "de", name: "German", markers: ["der", "die", "das", "und", "ist", "mit", "den", "von", "für", "auf", "ein"] },
  { code: "it", name: "Italian", markers: ["di", "che", "la", "il", "per", "con", "del", "una", "sono", "nel", "della"] },
  { code: "pt", name: "Portuguese", markers: ["de", "do", "da", "que", "em", "para", "com", "uma", "por", "não", "dos"] },
];

const TOPIC_TAXONOMY = [
  {
    id: "politics",
    label: "Politics & Government",
    category: "Politics",
    keywords: ["president", "minister", "government", "senate", "congress", "election", "policy", "administration", "parliament", "campaign"],
  },
  {
    id: "economy",
    label: "Economy & Finance",
    category: "Business",
    keywords: ["market", "economy", "stock", "inflation", "budget", "trade", "bank", "finance", "investment", "tax"],
  },
  {
    id: "technology",
    label: "Technology & Digital",
    category: "Technology",
    keywords: ["technology", "software", "ai", "cyber", "data", "internet", "platform", "chip", "startup", "app"],
  },
  {
    id: "health",
    label: "Health & Medicine",
    category: "Health",
    keywords: ["health", "disease", "doctor", "hospital", "vaccine", "medical", "treatment", "patient", "virus", "clinical"],
  },
  {
    id: "science",
    label: "Science & Research",
    category: "Science",
    keywords: ["research", "scientist", "study", "laboratory", "discovery", "experiment", "university", "analysis", "evidence", "report"],
  },
  {
    id: "world",
    label: "World Affairs",
    category: "World",
    keywords: ["international", "foreign", "country", "border", "embassy", "diplomatic", "global", "nation", "world", "leaders"],
  },
  {
    id: "security",
    label: "Security & Conflict",
    category: "Security",
    keywords: ["military", "defense", "war", "attack", "security", "weapon", "troops", "conflict", "terror", "missile"],
  },
  {
    id: "justice",
    label: "Law & Justice",
    category: "Legal",
    keywords: ["court", "judge", "justice", "lawsuit", "trial", "legal", "attorney", "ruling", "crime", "investigation"],
  },
  {
    id: "environment",
    label: "Environment & Climate",
    category: "Environment",
    keywords: ["climate", "environment", "wildfire", "carbon", "pollution", "storm", "energy", "temperature", "emissions", "weather"],
  },
  {
    id: "society",
    label: "Society & Culture",
    category: "Society",
    keywords: ["education", "community", "school", "media", "culture", "rights", "protest", "family", "social", "public"],
  },
];

const STYLE_MARKERS = {
  analytical: ["according", "data", "report", "analysis", "evidence", "officials", "documents", "study", "research", "numbers"],
  opinionated: ["should", "must", "clearly", "obviously", "perhaps", "believe", "think", "opinion", "argue", "seems"],
  conversational: ["you", "your", "we", "our", "let's", "can't", "don't", "won't", "what", "why"],
};

const EMOTION_LEXICON = {
  trust: ["verified", "confirmed", "reliable", "trusted", "official", "documented", "credible", "consistent"],
  fear: ["fear", "panic", "threat", "danger", "terrifying", "risk", "warning", "crisis"],
  anger: ["angry", "furious", "outrage", "betrayal", "corrupt", "traitor", "rage", "attack"],
  sadness: ["sad", "grief", "loss", "mourning", "tragic", "devastating", "sorrow", "heartbreaking"],
  joy: ["joy", "success", "win", "hope", "improved", "celebrate", "benefit", "progress"],
  surprise: ["shocking", "surprising", "unexpected", "suddenly", "explosive", "astonishing", "unbelievable"],
  disgust: ["disgusting", "revolting", "scam", "fraud", "dirty", "corrupt", "vile", "toxic"],
};

const CONTENT_STOPWORDS = new Set([
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
  "said",
  "into",
  "also",
  "just",
  "more",
  "most",
  "very",
]);

function parseWeight(name, fallback) {
  const parsed = Number(process.env[name] || fallback);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function dedupe(values = [], limit = 8) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()))].slice(0, limit);
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function countWords(text = "") {
  return tokenizeWords(text).length;
}

function tokenizeWords(text = "", { preserveCase = false } = {}) {
  const normalized = normalizeWhitespace(removeUrls(text))
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(" ").filter(Boolean);
  return preserveCase ? tokens : tokens.map((token) => token.toLowerCase());
}

function countOccurrences(text = "", phrase = "") {
  if (!text || !phrase) {
    return 0;
  }

  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = String(text).match(new RegExp(`\\b${escaped}\\b`, "gi")) || [];
  return matches.length;
}

function buildRuleFinding({ id, title, score, weight, message, evidence, recommendation }) {
  const clampedScore = clampConfidence(score);

  return {
    id,
    title,
    score: clampedScore,
    weightedScore: clampedScore * weight,
    weight,
    severity: clampedScore >= 0.72 ? "high" : clampedScore >= 0.4 ? "medium" : clampedScore > 0 ? "low" : "none",
    message,
    evidence,
    recommendation,
  };
}

function extractPublishedDateCandidates(text = "") {
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/g,
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
  ];

  const matches = [];

  patterns.forEach((pattern) => {
    const result = text.match(pattern) || [];
    matches.push(...result);
  });

  return dedupe(matches, 8);
}

function extractOrganizations(text = "") {
  const orgRegex = new RegExp(`\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,4}\\s+(?:${ORGANIZATION_SUFFIXES.join("|")}))\\b`, "g");
  const matches = [...text.matchAll(orgRegex)].map((match) => match[1]);
  return dedupe(matches, 10);
}

function extractPeople(text = "", organizations = []) {
  const orgSet = new Set(organizations);
  const peopleRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
  const matches = [...text.matchAll(peopleRegex)]
    .map((match) => match[1])
    .filter((candidate) => !orgSet.has(candidate))
    .filter((candidate) => !MONTH_NAMES.includes(candidate.split(" ")[0]))
    .filter((candidate) => !ORGANIZATION_SUFFIXES.some((suffix) => candidate.endsWith(suffix)));
  return dedupe(matches, 12);
}

function extractLocations(text = "", people = [], organizations = []) {
  const blocked = new Set([...people, ...organizations]);
  const locationRegex = /\b(?:in|at|from|to|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
  const matches = [...text.matchAll(locationRegex)].map((match) => match[1]).filter((candidate) => !blocked.has(candidate));
  return dedupe(matches, 10);
}

function analyzeSentiment(text = "") {
  const words = tokenizeWords(text);
  const positiveCount = words.filter((word) => POSITIVE_WORDS.includes(word)).length;
  const negativeCount = words.filter((word) => NEGATIVE_WORDS.includes(word)).length;
  const emotionalCount = words.filter((word) => EMOTIONAL_WORDS.includes(word)).length;
  const normalizedScore = Math.max(-1, Math.min(1, (positiveCount - negativeCount) / Math.max(words.length / 12, 1)));
  const emotionalIntensity = clampConfidence(emotionalCount / Math.max(words.length / 14, 1));

  return {
    label: normalizedScore > 0.12 ? "positive" : normalizedScore < -0.12 ? "negative" : "neutral",
    score: Number(normalizedScore.toFixed(3)),
    positiveCount,
    negativeCount,
    emotionalIntensity: Number(emotionalIntensity.toFixed(3)),
  };
}

function summarizeEntityCounts(entities = {}) {
  const counts = {
    people: entities.people?.length || 0,
    organizations: entities.organizations?.length || 0,
    locations: entities.locations?.length || 0,
    dates: entities.dates?.length || 0,
    sources: entities.sources?.length || 0,
  };

  return {
    ...counts,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
  };
}

function extractNamedEntities(text = "", source = "") {
  const normalizedText = String(text || "");
  const organizations = extractOrganizations(normalizedText);
  const people = extractPeople(normalizedText, organizations);
  const locations = extractLocations(normalizedText, people, organizations);
  const dates = extractPublishedDateCandidates(normalizedText);
  const entities = {
    people,
    organizations,
    locations,
    dates,
    sources: dedupe([getHostname(source)].filter(Boolean), 3),
  };

  return {
    ...entities,
    counts: summarizeEntityCounts(entities),
  };
}

function detectLanguage(text = "") {
  const words = tokenizeWords(text).slice(0, 280);

  if (!words.length) {
    return {
      code: "unknown",
      name: "Unknown",
      confidence: 0,
      distribution: [],
      sampleSize: 0,
    };
  }

  const scores = LANGUAGE_PROFILES.map((profile) => {
    const markerHits = profile.markers.reduce((sum, marker) => sum + words.filter((word) => word === marker).length, 0);
    const accentedHits = words.filter((word) => /[áéíóúñàèìòùâêîôûäëïöüç]/i.test(word)).length;
    const score = markerHits + (profile.code === "en" ? 0 : accentedHits * 0.18);

    return {
      code: profile.code,
      name: profile.name,
      score,
    };
  }).sort((left, right) => right.score - left.score);

  const strongest = scores[0];
  const totalScore = scores.reduce((sum, item) => sum + item.score, 0);

  if (!strongest || strongest.score < 2) {
    return {
      code: "unknown",
      name: "Unknown",
      confidence: 0.2,
      distribution: [],
      sampleSize: words.length,
    };
  }

  return {
    code: strongest.code,
    name: strongest.name,
    confidence: Number((strongest.score / Math.max(totalScore, strongest.score)).toFixed(3)),
    distribution: scores
      .filter((item) => item.score > 0)
      .slice(0, 4)
      .map((item) => ({
        code: item.code,
        name: item.name,
        score: item.score,
      })),
    sampleSize: words.length,
  };
}

function extractKeyPhrases(text = "", limit = 8) {
  const tokens = tokenizeWords(text);
  const phrases = new Map();

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index];
    const second = tokens[index + 1];
    const third = tokens[index + 2];

    if (first.length < 4 || second.length < 4 || CONTENT_STOPWORDS.has(first) || CONTENT_STOPWORDS.has(second)) {
      continue;
    }

    const bigram = `${first} ${second}`;
    phrases.set(bigram, (phrases.get(bigram) || 0) + 1);

    if (third && third.length >= 4 && !CONTENT_STOPWORDS.has(third)) {
      const trigram = `${first} ${second} ${third}`;
      phrases.set(trigram, (phrases.get(trigram) || 0) + 1.25);
    }
  }

  return [...phrases.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term, score]) => ({
      term,
      score: Number(score.toFixed(2)),
      source: "phrase",
    }));
}

function buildKeywordMetadata(text = "", influentialKeywords = []) {
  const baseKeywords = extractKeywordCandidates(text, 12);
  const phrases = extractKeyPhrases(text, 8);
  const merged = new Map();

  (influentialKeywords || []).forEach((item, index) => {
    const term = String(item.term || item.keyword || "").trim();

    if (!term) {
      return;
    }

    merged.set(term.toLowerCase(), {
      term,
      score: Number((Math.max(Number(item.weight || 0), 0.18) * 100).toFixed(2)),
      source: "model",
      rank: index + 1,
    });
  });

  phrases.forEach((item, index) => {
    const key = item.term.toLowerCase();

    if (!merged.has(key)) {
      merged.set(key, {
        term: item.term,
        score: Number((item.score * 18).toFixed(2)),
        source: "phrase",
        rank: influentialKeywords.length + index + 1,
      });
    }
  });

  baseKeywords.forEach((term, index) => {
    const key = term.toLowerCase();

    if (!merged.has(key)) {
      merged.set(key, {
        term,
        score: Number((36 - index * 2.2).toFixed(2)),
        source: "frequency",
        rank: influentialKeywords.length + phrases.length + index + 1,
      });
    }
  });

  const items = [...merged.values()]
    .sort((left, right) => right.score - left.score || left.rank - right.rank)
    .slice(0, 12);

  return {
    items,
    keyPhrases: phrases.map((item) => item.term).slice(0, 6),
    keywords: items.map((item) => item.term),
  };
}

function detectTopics({ headline = "", text = "", keywordItems = [] }) {
  const headlineText = String(headline || "").toLowerCase();
  const bodyText = String(text || "").toLowerCase();
  const keywords = keywordItems.map((item) => String(item.term || "").toLowerCase());

  const scoredTopics = TOPIC_TAXONOMY.map((topic) => {
    let score = 0;

    topic.keywords.forEach((keyword) => {
      const headlineHits = countOccurrences(headlineText, keyword);
      const bodyHits = Math.min(countOccurrences(bodyText, keyword), 6);
      const keywordHit = keywords.some((item) => item.includes(keyword) || keyword.includes(item)) ? 1 : 0;
      score += headlineHits * 2.8 + bodyHits * 0.75 + keywordHit * 2.2;
    });

    return {
      id: topic.id,
      label: topic.label,
      category: topic.category,
      rawScore: Number(score.toFixed(2)),
    };
  })
    .filter((topic) => topic.rawScore > 0)
    .sort((left, right) => right.rawScore - left.rawScore);

  if (!scoredTopics.length) {
    return {
      primary: { id: "general", label: "General News", category: "General", confidence: 0.35 },
      secondary: [],
      distribution: [],
    };
  }

  const topScore = scoredTopics[0].rawScore || 1;
  const totalScore = scoredTopics.reduce((sum, item) => sum + item.rawScore, 0) || 1;
  const distribution = scoredTopics.slice(0, 5).map((item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
    score: item.rawScore,
    confidence: Number((item.rawScore / totalScore).toFixed(3)),
    strength: Number((item.rawScore / topScore).toFixed(3)),
  }));

  return {
    primary: distribution[0],
    secondary: distribution.slice(1, 3),
    distribution,
  };
}

function detectArticleCategory({ topicDetection = {} }) {
  const primaryTopic = topicDetection.primary;

  if (!primaryTopic) {
    return {
      label: "General",
      confidence: 0.35,
      rationale: "No strong topical pattern stood out in the article text.",
    };
  }

  const rationale = primaryTopic.confidence >= 0.42
    ? `The article most strongly aligns with ${primaryTopic.label.toLowerCase()} signals from the headline and body.`
    : `The article leans toward ${primaryTopic.label.toLowerCase()}, but the topical signal is still somewhat mixed.`;

  return {
    label: primaryTopic.category,
    confidence: primaryTopic.confidence,
    rationale,
    primaryTopic: primaryTopic.label,
    secondaryTopics: topicDetection.secondary?.map((item) => item.label) || [],
  };
}

function countSyllables(word = "") {
  const cleaned = String(word || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (!cleaned) {
    return 0;
  }

  if (cleaned.length <= 3) {
    return 1;
  }

  let count = (cleaned.match(/[aeiouy]+/g) || []).length;

  if (cleaned.endsWith("e")) {
    count -= 1;
  }

  if (cleaned.endsWith("le") && cleaned.length > 2 && !/[aeiouy]/.test(cleaned.charAt(cleaned.length - 3))) {
    count += 1;
  }

  return Math.max(count, 1);
}

function analyzeReadingComplexity(text = "") {
  const sentences = splitSentences(text);
  const words = tokenizeWords(text).filter((token) => /[a-z]/i.test(token));
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const wordCount = words.length || 1;
  const sentenceCount = sentences.length || 1;
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllables / wordCount;
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;
  const uniqueWords = new Set(words.map((word) => word.toLowerCase())).size;
  const lexicalDiversity = uniqueWords / wordCount;
  const fleschReadingEase = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  const fleschKincaidGrade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 220));
  let level = "Standard";

  if (fleschReadingEase >= 70) {
    level = "Easy";
  } else if (fleschReadingEase < 50) {
    level = "Advanced";
  }

  if (fleschReadingEase < 30) {
    level = "Expert";
  }

  return {
    level,
    readingTimeMinutes,
    fleschReadingEase: Math.round(fleschReadingEase),
    fleschKincaidGrade: Number(fleschKincaidGrade.toFixed(1)),
    averageSentenceLength: Number(avgSentenceLength.toFixed(1)),
    averageWordLength: Number(avgWordLength.toFixed(1)),
    lexicalDiversity: Number(lexicalDiversity.toFixed(3)),
    syllablesPerWord: Number(avgSyllablesPerWord.toFixed(2)),
  };
}

function detectWritingStyle({ headline = "", text = "", sentiment = {}, suspiciousSentences = [], ruleFindings = [], readingComplexity = {} }) {
  const lowerText = String(text || "").toLowerCase();
  const opinionHits = STYLE_MARKERS.opinionated.reduce((sum, marker) => sum + countOccurrences(lowerText, marker), 0);
  const analyticalHits = STYLE_MARKERS.analytical.reduce((sum, marker) => sum + countOccurrences(lowerText, marker), 0);
  const conversationalHits = STYLE_MARKERS.conversational.reduce((sum, marker) => sum + countOccurrences(lowerText, marker), 0);
  const firstPersonHits = (lowerText.match(/\b(i|we|our|my|us)\b/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const quoteCount = Math.floor((text.match(/"/g) || []).length / 2);
  const numeralCount = (text.match(/\b\d+(?:\.\d+)?\b/g) || []).length;
  const sensationalRuleScore = ruleFindings
    .filter((rule) => ["clickbait_title", "excessive_punctuation", "emotional_language", "sensational_phrases"].includes(rule.id))
    .reduce((sum, rule) => sum + Number(rule.score || 0), 0);
  const scores = [
    {
      label: "Straight News",
      value: quoteCount * 0.18 + analyticalHits * 0.12 + numeralCount * 0.06 + (sentiment.label === "neutral" ? 0.18 : 0) + (suspiciousSentences.length ? 0 : 0.12),
    },
    {
      label: "Analytical",
      value: analyticalHits * 0.18 + numeralCount * 0.08 + (readingComplexity.averageSentenceLength || 0) / 90 + quoteCount * 0.04,
    },
    {
      label: "Opinionated",
      value: opinionHits * 0.18 + firstPersonHits * 0.1 + Math.abs(Number(sentiment.score || 0)) * 0.5,
    },
    {
      label: "Conversational",
      value: conversationalHits * 0.16 + questionCount * 0.18 + firstPersonHits * 0.08,
    },
    {
      label: "Sensational",
      value: sensationalRuleScore * 0.55 + suspiciousSentences.length * 0.18 + countMatches(String(headline || "").toLowerCase(), CLICKBAIT_PATTERNS) * 0.3,
    },
  ].sort((left, right) => right.value - left.value);

  const total = scores.reduce((sum, item) => sum + item.value, 0) || 1;
  const normalized = scores.map((item) => ({
    style: item.label,
    score: Number((item.value / total).toFixed(3)),
  }));
  const primary = normalized[0];
  const indicators = [];

  if (analyticalHits) {
    indicators.push(`${analyticalHits} evidence or analysis markers`);
  }

  if (opinionHits) {
    indicators.push(`${opinionHits} opinionated phrases`);
  }

  if (questionCount) {
    indicators.push(`${questionCount} rhetorical or direct question marks`);
  }

  if (suspiciousSentences.length) {
    indicators.push(`${suspiciousSentences.length} suspicious sentence warnings`);
  }

  if (quoteCount) {
    indicators.push(`${quoteCount} quoted statement blocks`);
  }

  return {
    label: primary.style,
    confidence: primary.score,
    rationale: `${primary.style} is the dominant writing style based on tone, sentence structure, attribution markers, and intensity cues.`,
    distribution: normalized,
    indicators: indicators.slice(0, 4),
  };
}

function detectEmotions(text = "") {
  const words = tokenizeWords(text);
  const counts = Object.entries(EMOTION_LEXICON).map(([emotion, markers]) => {
    const count = words.filter((word) => markers.includes(word)).length;
    return {
      emotion,
      count,
      score: Number(clampConfidence(count / Math.max(words.length / 22, 1)).toFixed(3)),
    };
  });
  const ranked = counts.sort((left, right) => right.score - left.score || right.count - left.count);
  const dominant = ranked[0];

  if (!dominant || dominant.count === 0) {
    return {
      dominant: "neutral",
      intensity: 0.12,
      distribution: ranked,
      summary: "No strong emotional profile stood out in the article language.",
    };
  }

  const secondary = ranked.find((item) => item.emotion !== dominant.emotion && item.count > 0);

  return {
    dominant: dominant.emotion,
    secondary: secondary?.emotion || null,
    intensity: dominant.score,
    distribution: ranked,
    summary: secondary
      ? `The language is led by ${dominant.emotion} cues, with a secondary ${secondary.emotion} tone.`
      : `The language is primarily driven by ${dominant.emotion} cues.`,
  };
}

function evaluateCredibilityRules({ headline = "", text = "", source = "", url = "", author = "", publishedAt = "" }) {
  const title = String(headline || "").trim();
  const content = String(text || "");
  const lowerText = content.toLowerCase();
  const combinedSource = url || source;
  const hostname = getHostname(combinedSource);
  const sourceReputation = getSourceReputation(combinedSource);
  const wordCount = countWords(content);
  const uppercaseLetters = (content.match(/[A-Z]/g) || []).length;
  const letters = (content.match(/[A-Za-z]/g) || []).length || 1;
  const capitalRatio = uppercaseLetters / letters;
  const punctuationBursts = (content.match(/[!?]{2,}/g) || []).length;
  const punctuationDensity = ((content.match(/[!?]/g) || []).length + punctuationBursts * 2) / Math.max(wordCount, 1);
  const emotionalHits = countMatches(lowerText, EMOTIONAL_WORDS.map((word) => new RegExp(`\\b${word}\\b`, "i")));
  const sensationalHits = countMatches(lowerText, SENSATIONAL_PATTERNS);
  const clickbaitHits = countMatches(title.toLowerCase(), CLICKBAIT_PATTERNS);
  const suspiciousDomainHit =
    sourceReputation.badge === "Suspicious" ||
    (hostname &&
      !isTrustedSource(combinedSource) &&
      (/\b(newsflash|patriot|truth|rumor|viral|daily|freedom|insider)\b/i.test(hostname) || /\.(buzz|click|top|xyz|info)$/i.test(hostname)));

  const rules = [
    buildRuleFinding({
      id: "clickbait_title",
      title: "Clickbait title",
      score: Math.min(1, clickbaitHits / 2),
      weight: 1.1,
      message: clickbaitHits ? "The headline contains clickbait-style phrasing." : "The headline does not show strong clickbait cues.",
      evidence: title || "No headline provided",
      recommendation: "Compare the title with how trusted outlets phrase the same event.",
    }),
    buildRuleFinding({
      id: "excessive_capitalization",
      title: "Excessive capitalization",
      score: capitalRatio >= 0.28 ? 1 : capitalRatio >= 0.18 ? 0.55 : 0,
      weight: 0.9,
      message: capitalRatio >= 0.18 ? "The article uses an unusually high amount of uppercase text." : "Capitalization appears normal.",
      evidence: `${Math.round(capitalRatio * 100)}% uppercase letter ratio`,
      recommendation: "Prefer calmer reporting styles over dramatic all-caps emphasis.",
    }),
    buildRuleFinding({
      id: "excessive_punctuation",
      title: "Excessive punctuation",
      score: punctuationDensity >= 0.14 ? 1 : punctuationDensity >= 0.08 ? 0.55 : 0,
      weight: 0.8,
      message: punctuationDensity >= 0.08 ? "The article uses punctuation bursts that often appear in sensational writing." : "Punctuation usage appears normal.",
      evidence: `${(content.match(/[!?]/g) || []).length} exclamation/question marks`,
      recommendation: "Look for articles that rely on evidence more than emotional punctuation.",
    }),
    buildRuleFinding({
      id: "emotional_language",
      title: "Emotional language",
      score: emotionalHits >= 6 ? 1 : emotionalHits >= 3 ? 0.55 : emotionalHits > 0 ? 0.25 : 0,
      weight: 1,
      message: emotionalHits ? "The article contains emotionally loaded language." : "The article does not rely heavily on emotional wording.",
      evidence: `${emotionalHits} emotional language hits`,
      recommendation: "Cross-check emotionally charged claims with source documents or neutral coverage.",
    }),
    buildRuleFinding({
      id: "sensational_phrases",
      title: "Sensational phrases",
      score: sensationalHits >= 4 ? 1 : sensationalHits >= 2 ? 0.65 : sensationalHits > 0 ? 0.3 : 0,
      weight: 1.2,
      message: sensationalHits ? "The article contains sensational or manipulative phrases." : "No strong sensational phrases were detected.",
      evidence: `${sensationalHits} sensational phrase matches`,
      recommendation: "Treat sensational framing as a signal to verify before sharing.",
    }),
    buildRuleFinding({
      id: "suspicious_domain",
      title: "Suspicious domain",
      score:
        sourceReputation.badge === "Suspicious"
          ? 0.98
          : suspiciousDomainHit
            ? 0.92
            : sourceReputation.badge === "Medium"
              ? 0.35
              : hostname && !isTrustedSource(combinedSource)
                ? 0.25
                : 0,
      weight: 1.15,
      message:
        sourceReputation.badge === "Suspicious"
          ? "The source domain is listed as suspicious in the source reputation registry."
          : suspiciousDomainHit
            ? "The source domain looks suspicious or low-credibility."
            : hostname
              ? sourceReputation.badge === "Trusted"
                ? "The source domain is listed as trusted in the source reputation registry."
                : sourceReputation.badge === "Medium"
                  ? "The source domain has mixed or medium reputation signals."
                  : "The source domain is not yet recognized as trusted."
              : "No source domain was provided.",
      evidence: hostname
        ? `${hostname} | ${sourceReputation.politicalBias} | ${sourceReputation.country} | ${sourceReputation.reliability}`
        : "No domain provided",
      recommendation: "Inspect the publisher page, ownership, and editorial standards before relying on the article.",
    }),
    buildRuleFinding({
      id: "article_length",
      title: "Article length",
      score: wordCount < 120 ? 0.95 : wordCount < 220 ? 0.55 : wordCount > 2600 ? 0.15 : 0,
      weight: 0.75,
      message: wordCount < 220 ? "The article is short enough to limit context and evidence." : "Article length looks reasonable for a news report.",
      evidence: `${wordCount} words`,
      recommendation: "Short articles should be checked against fuller coverage from reputable sources.",
    }),
    buildRuleFinding({
      id: "missing_author",
      title: "Missing author",
      score: author ? 0 : 0.7,
      weight: 0.8,
      message: author ? "An author was provided." : "No author information was supplied.",
      evidence: author || "No author found",
      recommendation: "Anonymous or unattributed stories deserve extra scrutiny.",
    }),
    buildRuleFinding({
      id: "missing_publication_date",
      title: "Missing publication date",
      score: publishedAt ? 0 : 0.65,
      weight: 0.8,
      message: publishedAt ? "A publication date was provided." : "No publication date was supplied.",
      evidence: publishedAt || "No publication date found",
      recommendation: "Check when the story was published before relying on it or resharing it.",
    }),
  ];

  const totalWeight = rules.reduce((sum, rule) => sum + rule.weight, 0) || 1;
  const weightedRisk = rules.reduce((sum, rule) => sum + rule.weightedScore, 0) / totalWeight;

  return {
    score: Number(weightedRisk.toFixed(4)),
    findings: rules,
  };
}

function detectSuspiciousSentences(text = "") {
  return splitSentences(text)
    .map((sentence) => {
      const lower = sentence.toLowerCase();
      const reasons = [];
      let score = 0;

      if (countMatches(lower, SENSATIONAL_PATTERNS)) {
        reasons.push("sensational language");
        score += 0.45;
      }

      if (countMatches(lower, EMOTIONAL_WORDS.map((word) => new RegExp(`\\b${word}\\b`, "i")))) {
        reasons.push("emotional wording");
        score += 0.3;
      }

      if (/[!?]{2,}/.test(sentence)) {
        reasons.push("punctuation burst");
        score += 0.2;
      }

      if ((sentence.match(/[A-Z]/g) || []).length / Math.max((sentence.match(/[A-Za-z]/g) || []).length, 1) > 0.24) {
        reasons.push("uppercase emphasis");
        score += 0.18;
      }

      if (/\banonymous\b|\bwithout evidence\b|\bthey don't want you to know\b/i.test(lower)) {
        reasons.push("unsupported framing");
        score += 0.4;
      }

      return {
        sentence,
        score: Number(Math.min(score, 1).toFixed(3)),
        reasons,
      };
    })
    .filter((item) => item.score >= 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function buildProbabilityDistribution({ mlFakeProbability, ruleRiskScore, threshold, suspiciousSentenceCount }) {
  const mlWeightRaw = parseWeight("ML_WEIGHT", 0.68);
  const ruleWeightRaw = parseWeight("RULE_WEIGHT", 0.32);
  const totalWeight = mlWeightRaw + ruleWeightRaw;
  const mlWeight = mlWeightRaw / totalWeight;
  const ruleWeight = ruleWeightRaw / totalWeight;
  const combinedFakeProbability = clampConfidence(mlFakeProbability * mlWeight + ruleRiskScore * ruleWeight);
  const conflictScore = clampConfidence(Math.abs(mlFakeProbability - ruleRiskScore));
  const ambiguityScore = clampConfidence(1 - Math.abs(combinedFakeProbability * 2 - 1));
  const thresholdGap = Math.max(0, threshold - Math.max(combinedFakeProbability, 1 - combinedFakeProbability)) / threshold;
  let uncertainProbability = clampConfidence(ambiguityScore * 0.45 + conflictScore * 0.35 + thresholdGap * 0.2);

  if (suspiciousSentenceCount >= 3 && uncertainProbability < 0.32) {
    uncertainProbability = 0.32;
  }

  const realComponent = (1 - combinedFakeProbability) * (1 - uncertainProbability);
  const fakeComponent = combinedFakeProbability * (1 - uncertainProbability);
  const total = realComponent + fakeComponent + uncertainProbability || 1;
  const probabilities = {
    REAL: Number((realComponent / total).toFixed(4)),
    FAKE: Number((fakeComponent / total).toFixed(4)),
    UNCERTAIN: Number((uncertainProbability / total).toFixed(4)),
  };

  return {
    probabilities,
    combinedFakeProbability,
    mlWeight: Number(mlWeight.toFixed(2)),
    ruleWeight: Number(ruleWeight.toFixed(2)),
  };
}

function buildRecommendation({ label, credibilityScore, ruleFindings, suspiciousSentences, author, publishedAt }) {
  const missingMetadata = [!author ? "author" : null, !publishedAt ? "publication date" : null].filter(Boolean);
  const highRiskRules = ruleFindings.filter((rule) => rule.score >= 0.55).map((rule) => rule.title.toLowerCase());

  if (label === "FAKE") {
    return `High risk of misinformation. Do not share this article until it is verified against reputable outlets and primary sources.${highRiskRules.length ? ` Review these warning areas first: ${highRiskRules.slice(0, 3).join(", ")}.` : ""}`;
  }

  if (label === "UNCERTAIN") {
    return `Treat this article as unverified for now. Compare it with at least two trusted publishers, inspect quoted evidence, and confirm metadata before relying on it.${missingMetadata.length ? ` Missing: ${missingMetadata.join(" and ")}.` : ""}`;
  }

  return `The article appears relatively credible in the language-based review with a ${credibilityScore}/100 base credibility score. Still confirm the source, quoted evidence, and publication context before making decisions based on it.${suspiciousSentences.length ? " A few sentences still deserve a closer read." : ""}`;
}

function buildDecisionExplanation({
  label,
  modelName,
  modelVersion,
  credibilityScore,
  mlFakeProbability,
  ruleRiskScore,
  topInfluentialKeywords,
  ruleFindings,
  articleCategory,
  languageInfo,
}) {
  const topRules = ruleFindings
    .filter((rule) => rule.score > 0.2)
    .sort((left, right) => right.weightedScore - left.weightedScore)
    .slice(0, 3)
    .map((rule) => rule.title.toLowerCase());
  const keywordText = topInfluentialKeywords.slice(0, 6).map((item) => item.term).join(", ");

  return `The ${label} decision combined the ${modelName} model${modelVersion ? ` (${modelVersion})` : ""} with a rule-based credibility review. The model estimated ${(mlFakeProbability * 100).toFixed(0)}% fake likelihood, the rule engine contributed ${(ruleRiskScore * 100).toFixed(0)}% risk, and the base credibility score before evidence verification and trust weighting is ${credibilityScore}/100. Detected language: ${languageInfo.name}. Article category: ${articleCategory.label}. Influential keywords: ${keywordText || "not enough strong keywords"}. Highest-impact rule signals: ${topRules.join(", ") || "no major rule signals"}.`;
}

export function analyzeArticleIntelligence({
  headline = "",
  text = "",
  source = "",
  url = "",
  author = "",
  publishedAt = "",
  mlResult = {},
}) {
  const title = String(headline || "").trim();
  const combinedText = `${title ? `${title}. ` : ""}${text}`.trim();
  const summary = buildExtractiveSummary({ headline, text }, 4);
  const ruleEvaluation = evaluateCredibilityRules({ headline, text, source, url, author, publishedAt });
  const suspiciousSentences = detectSuspiciousSentences(text);
  const sentiment = analyzeSentiment(text);
  const languageInfo = detectLanguage(combinedText);
  const entities = extractNamedEntities(combinedText, url || source);
  const topInfluentialKeywords = (mlResult.influentialKeywords || []).length
    ? mlResult.influentialKeywords
    : extractKeywordCandidates(text, 8).map((term, index) => ({ term, weight: Number((0.8 - index * 0.08).toFixed(3)) }));
  const keywordMetadata = buildKeywordMetadata(combinedText, topInfluentialKeywords);
  const topicDetection = detectTopics({ headline: title, text: combinedText, keywordItems: keywordMetadata.items });
  const articleCategory = detectArticleCategory({ headline: title, topicDetection });
  const readingComplexity = analyzeReadingComplexity(text);
  const writingStyle = detectWritingStyle({
    headline: title,
    text,
    sentiment,
    suspiciousSentences,
    ruleFindings: ruleEvaluation.findings,
    readingComplexity,
  });
  const emotion = detectEmotions(text);
  const rawRealProbability = clampConfidence(
    mlResult.modelProbabilities?.REAL ??
      mlResult.probabilities?.REAL ??
      (mlResult.predictedLabel === "REAL" || mlResult.label === "REAL" ? mlResult.confidenceScore || 0.5 : 0.5)
  );
  const rawFakeProbability = clampConfidence(
    mlResult.modelProbabilities?.FAKE ??
      mlResult.probabilities?.FAKE ??
      (mlResult.predictedLabel === "FAKE" || mlResult.label === "FAKE" ? mlResult.confidenceScore || 0.5 : 0.5)
  );
  const probabilityTotal = rawRealProbability + rawFakeProbability || 1;
  const modelProbabilities = {
    REAL: Number((rawRealProbability / probabilityTotal).toFixed(4)),
    FAKE: Number((rawFakeProbability / probabilityTotal).toFixed(4)),
  };
  const thresholdValue = Number(mlResult.threshold || process.env.CONFIDENCE_THRESHOLD || 0.72);
  const threshold = Number.isFinite(thresholdValue) ? thresholdValue : 0.72;
  const probabilityBuild = buildProbabilityDistribution({
    mlFakeProbability: modelProbabilities.FAKE,
    ruleRiskScore: ruleEvaluation.score,
    threshold,
    suspiciousSentenceCount: suspiciousSentences.length,
  });
  const credibilityScore = Math.round((1 - probabilityBuild.combinedFakeProbability) * 100);
  const probabilities = probabilityBuild.probabilities;
  const maxEntry = Object.entries(probabilities).sort((left, right) => right[1] - left[1])[0] || ["UNCERTAIN", 0.5];
  let label = normalizeResultLabel(maxEntry[0]);
  let confidenceScore = clampConfidence(maxEntry[1]);

  if (label !== "UNCERTAIN" && confidenceScore < threshold) {
    label = "UNCERTAIN";
    confidenceScore = Math.max(confidenceScore, probabilities.UNCERTAIN);
  }

  const recommendation = buildRecommendation({
    label,
    credibilityScore,
    ruleFindings: ruleEvaluation.findings,
    suspiciousSentences,
    author,
    publishedAt,
  });
  const paragraphCount =
    String(text || "")
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean).length || 1;

  return {
    label,
    language: languageInfo.name,
    languageInfo,
    confidenceScore: Number(confidenceScore.toFixed(4)),
    confidence: Math.round(confidenceScore * 100),
    credibilityScore,
    probabilities,
    modelProbabilities,
    topInfluentialKeywords,
    suspiciousSentences,
    explanation: buildDecisionExplanation({
      label,
      modelName: mlResult.model,
      modelVersion: mlResult.modelVersion,
      credibilityScore,
      mlFakeProbability: modelProbabilities.FAKE,
      ruleRiskScore: ruleEvaluation.score,
      topInfluentialKeywords,
      ruleFindings: ruleEvaluation.findings,
      articleCategory,
      languageInfo,
    }),
    recommendation,
    summary,
    sentiment,
    entities,
    keywords: keywordMetadata.keywords,
    keywordMetadata,
    topicDetection,
    articleCategory,
    readingComplexity,
    writingStyle,
    emotion,
    influentialKeywords: topInfluentialKeywords,
    ruleFindings: ruleEvaluation.findings,
    credibility: {
      score: credibilityScore,
      mlFakeProbability: Number(modelProbabilities.FAKE.toFixed(4)),
      ruleRiskScore: Number(ruleEvaluation.score.toFixed(4)),
      mlWeight: probabilityBuild.mlWeight,
      ruleWeight: probabilityBuild.ruleWeight,
    },
    articleStats: {
      wordCount: countWords(text),
      sentenceCount: splitSentences(text).length,
      paragraphCount,
      titleLength: title.length,
      hasAuthor: Boolean(author),
      hasPublicationDate: Boolean(publishedAt),
      sourceHost: getHostname(url || source),
      trustedSource: isTrustedSource(url || source),
      sourceReputationBadge: getSourceReputation(url || source).badge,
      sourceReliability: getSourceReputation(url || source).reliability,
      readingTimeMinutes: readingComplexity.readingTimeMinutes,
      lexicalDiversity: readingComplexity.lexicalDiversity,
    },
    nlpMetadata: {
      language: languageInfo,
      namedEntities: entities,
      keywordExtraction: keywordMetadata,
      topicDetection,
      articleCategory,
      sentiment,
      readingComplexity,
      writingStyle,
      emotion,
    },
    riskLevel: getRiskLevel(label, confidenceScore),
  };
}
