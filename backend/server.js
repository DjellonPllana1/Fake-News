import express from "express";
import cors from "cors";
import crypto from "crypto";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import "./env.js";
import { ensureDatabaseSchema, findUserByEmail, readDatabase, saveAnalysis, toAnalysisRow } from "./database.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const pythonBin = process.env.PYTHON_BIN || "python";
const trainingReportPath = "backend/models/training_report.json";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const labels = ["Real", "Fake", "Satire", "Bias", "Needs Review"];
const trustedDomains = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "abcnews.go.com",
  "abcnews.com",
  "npr.org",
  "theguardian.com",
  "nytimes.com",
  "washingtonpost.com",
  "cnn.com",
  "aljazeera.com",
  "dw.com",
];
const stopWords = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "are",
  "was",
  "were",
  "will",
  "have",
  "has",
  "about",
  "into",
  "over",
  "after",
  "before",
  "their",
  "they",
  "you",
  "your",
]);

function tokenize(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 160);
}

function getKeywordSignal(content) {
  const fakeKeywords = ["secret", "anonymous", "miracle", "controls", "claims", "unnamed", "shocking", "explosive", "conspiracy", "hoax"];
  const satireKeywords = ["satire", "joke", "parody", "mock", "comic"];
  const biasKeywords = ["opinion", "slant", "editorial", "bias", "perspective", "agenda"];
  const realKeywords = ["reuters", "report", "announces", "official", "service", "update", "launch", "study", "court", "minister"];

  return {
    Fake: fakeKeywords.filter((word) => content.includes(word)).length,
    Satire: satireKeywords.filter((word) => content.includes(word)).length,
    Bias: biasKeywords.filter((word) => content.includes(word)).length,
    Real: realKeywords.filter((word) => content.includes(word)).length,
  };
}

function findDatasetMatches(articles, headline, text) {
  const headlineTokens = new Set(tokenize(headline));
  const contentTokens = new Set(tokenize(`${headline} ${text}`));

  return articles
    .map((article) => {
      const titleTokens = tokenize(article.title);
      const articleTokens = tokenize(`${article.title} ${article.text.slice(0, 700)}`);
      const titleScore = titleTokens.filter((word) => headlineTokens.has(word)).length * 3;
      const bodyScore = articleTokens.filter((word) => contentTokens.has(word)).length;
      return { article, score: titleScore + bodyScore };
    })
    .filter((match) => match.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function classifyText({ headline = "", text = "" }, articles) {
  const content = `${headline} ${text}`.toLowerCase();
  const keywordSignal = getKeywordSignal(content);
  const matches = findDatasetMatches(articles, headline, text);

  const score = Object.fromEntries(labels.map((label) => [label, keywordSignal[label] * 5]));
  matches.forEach((match, index) => {
    score[match.article.label] += Math.max(2, match.score - index);
  });

  if (score.Satire > 0) score.Satire += 8;
  if (score.Bias > 0) score.Bias += 6;

  const [label, labelScore] = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  const fallbackLabel = content.trim().length < 20 ? "Real" : label;
  const confidence = Math.min(99, Math.max(66, Math.round(72 + labelScore * 1.7 + Math.min(matches[0]?.score || 0, 10))));
  const bestMatch = matches[0]?.article;

  let explanation = "The backend compares the submitted text with the local news dataset and keyword signals. ";
  if (bestMatch) {
    explanation += `Closest dataset example: "${bestMatch.title.slice(0, 90)}" (${bestMatch.label}). `;
  }
  if (fallbackLabel === "Fake") {
    explanation += "The result leans fake because the text is similar to fake dataset records or uses unverifiable/sensational language.";
  } else if (fallbackLabel === "Satire") {
    explanation += "The result leans satire because humorous or parody-style markers were found.";
  } else if (fallbackLabel === "Bias") {
    explanation += "The result leans bias because opinionated or editorial framing was detected.";
  } else {
    explanation += "The result leans real because it is closer to verified dataset records or neutral news language.";
  }

  return {
    label: fallbackLabel,
    confidence,
    explanation,
    matches: matches.slice(0, 3).map(({ article, score: matchScore }) => ({
      id: article.id,
      title: article.title,
      label: article.label,
      score: matchScore,
    })),
  };
}

function isHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getHostname(value = "") {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isTrustedSource(value = "") {
  const hostname = getHostname(value);
  return trustedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function countPatternMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function analyzeCredibilitySignals({ headline = "", text = "", source = "", url = "" }) {
  const content = `${headline} ${text}`.toLowerCase();
  const words = content.split(/\s+/).filter(Boolean);
  const sourceValue = url || source;
  const crediblePatterns = [
    /\b(reuters|associated press|ap news|bbc|npr|court|police|ministry|officials?|agency|department)\b/i,
    /\baccording to\b/i,
    /\bsaid in a statement\b/i,
    /\bconfirmed\b/i,
    /\breported\b/i,
    /\bdata from\b/i,
    /\bpublished\b/i,
    /\bannounced\b/i,
  ];
  const redFlagPatterns = [
    /\b(shocking|secret|miracle|censored|exposed|hoax|conspiracy|cover[- ]?up)\b/i,
    /\byou won'?t believe\b/i,
    /\bdoctors hate\b/i,
    /\banonymous sources claim\b/i,
    /\bwithout evidence\b/i,
    /\bmainstream media won'?t tell\b/i,
    /\btruth revealed\b/i,
    /\bguaranteed cure\b/i,
  ];

  return {
    textWords: words.length,
    trustedSource: isTrustedSource(sourceValue),
    sourceHost: getHostname(sourceValue),
    credibleSignals: countPatternMatches(content, crediblePatterns),
    redFlags: countPatternMatches(content, redFlagPatterns),
  };
}

function markNeedsReview(result, reason) {
  return {
    ...result,
    label: "Needs Review",
    confidence: Math.min(Number(result.confidence || 55), 58),
    probabilities: {
      ...(result.probabilities || {}),
      "Needs Review": Math.max(Number(result.probabilities?.["Needs Review"] || 0), 58),
    },
    warning: reason,
  };
}

function markRealFromTrustedEvidence(result, reason) {
  return {
    ...result,
    label: "Real",
    confidence: Math.min(Math.round(Number(result.probabilities?.Real || result.confidence || 82)), 88),
    warning: reason,
  };
}

function calibratePrediction(result, signals) {
  if (result.label === "Needs Review") {
    if (Number(result.probabilities?.Real || 0) >= 85 && signals.trustedSource && signals.credibleSignals >= 2 && signals.redFlags === 0) {
      return markRealFromTrustedEvidence(result, "Modeli ishte konservativ, por burimi dhe sinjalet e raportimit e mbeshtesin si lajm real.");
    }

    return result;
  }

  if (result.label === "Fake") {
    if (signals.textWords < 120 && signals.redFlags < 3) {
      return markNeedsReview(result, "Modeli dha Fake, por teksti eshte i shkurter dhe nuk ka mjaft sinjale mashtruese.");
    }

    if (signals.trustedSource && signals.redFlags < 3) {
      return markNeedsReview(result, "Burimi duket i besueshem, prandaj rezultati Fake kerkon verifikim manual.");
    }

    if (signals.credibleSignals >= 4 && signals.redFlags < 3) {
      return markNeedsReview(result, "Teksti ka shume sinjale raportimi normal dhe pak sinjale mashtruese.");
    }
  }

  if (result.label === "Real" && signals.redFlags >= 4 && !signals.trustedSource) {
    return markNeedsReview(result, "Teksti ka disa sinjale te forta sensacionaliste; kontrolloje manualisht para vendimit final.");
  }

  return result;
}

function extractMetaContent(html, property) {
  const tags = html.match(/<meta[^>]+>/gi) || [];
  const tag = tags.find((item) => new RegExp(`(?:property|name)=["']${property}["']`, "i").test(item));
  const content = tag?.match(/content=["']([^"']+)["']/i)?.[1] || "";
  return decodeHtmlEntities(content);
}

function flattenJsonLd(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];
  return [value, ...flattenJsonLd(value["@graph"])];
}

function extractJsonLdArticle(html = "") {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(stripHtml(block[1]));
      const nodes = flattenJsonLd(parsed);
      const article = nodes.find((node) => {
        const type = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        return type.some((item) => ["NewsArticle", "Article", "ReportageNewsArticle"].includes(item));
      });
      if (article) {
        return {
          title: decodeHtmlEntities(article.headline || article.name || ""),
          text: decodeHtmlEntities(article.articleBody || article.description || ""),
        };
      }
    } catch (error) {
      if (process.env.DEBUG_FETCH === "1") console.warn(error.message);
    }
  }
  return { title: "", text: "" };
}

function stripNonArticleBlocks(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<picture[\s\S]*?<\/picture>/gi, " ")
    .replace(/<video[\s\S]*?<\/video>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ");
}

function isBoilerplateParagraph(value = "") {
  const text = normalizeArticleText(value);
  const lower = text.toLowerCase();
  const blockedPatterns = [
    /^advertisement\b/,
    /^home news\b/,
    /^sponsored\b/,
    /^photo\b/,
    /^image\b/,
    /^caption\b/,
    /^read more\b/,
    /^related\b/,
    /^watch\b/,
    /^share\b/,
    /^follow\b/,
    /^subscribe\b/,
    /^sign up\b/,
    /^cookie\b/,
    /^privacy\b/,
    /^terms\b/,
    /\ball rights reserved\b/,
    /\bclick here\b/,
    /\bnewsletter\b/,
    /\bmore to explore\b/,
  ];
  const hasSentenceShape = /[.!?]["')\]]?$/.test(text) || text.split(/\s+/).length >= 18;
  return text.length < 55 || text.length > 1800 || !hasSentenceShape || blockedPatterns.some((pattern) => pattern.test(lower)) || looksLikeScriptText(text);
}

function extractParagraphsFromHtml(html = "") {
  const cleanedHtml = stripNonArticleBlocks(html);
  const paragraphMatches = [...cleanedHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  const seen = new Set();
  const paragraphs = [];

  for (const match of paragraphMatches) {
    const paragraph = normalizeArticleText(stripHtml(match[2]));
    const key = paragraph.toLowerCase();
    if (!paragraph || seen.has(key) || isBoilerplateParagraph(paragraph)) {
      continue;
    }

    seen.add(key);
    paragraphs.push(paragraph);
  }

  return paragraphs.join(" ");
}

function extractLooseTextFromHtml(html = "") {
  const blockSeparated = stripNonArticleBlocks(html)
    .replace(/<\/(p|div|section|article|h1|h2|h3|li)>/gi, "\n")
    .replace(/<(br|hr)\s*\/?>/gi, "\n");
  const rawLines = stripHtml(blockSeparated)
    .split(/\n+/)
    .map((line) => normalizeArticleText(line))
    .filter(Boolean);
  const seen = new Set();
  const lines = [];

  for (const line of rawLines) {
    const key = line.toLowerCase();
    if (seen.has(key) || looksLikeScriptText(line)) {
      continue;
    }

    seen.add(key);
    if (line.length >= 45 && !isBoilerplateParagraph(line)) {
      lines.push(line);
    }
  }

  return lines.join(" ");
}

function looksLikeListingPage({ title = "", text = "", hasArticleContainer = false, url = "" }) {
  const combined = `${title} ${text}`.toLowerCase();
  const listingSignals = ["breaking news", "latest top stories", "more to explore", "home news sport", "newsletters", "live weather"];
  const signalCount = listingSignals.filter((signal) => combined.includes(signal)).length;
  const pathParts = new URL(url || "https://example.com").pathname.split("/").filter(Boolean);
  const looksLikeHomepage = pathParts.length <= 1;
  return (looksLikeHomepage && signalCount >= 2) || (!hasArticleContainer && looksLikeHomepage && signalCount >= 1);
}

function normalizeArticleText(value = "") {
  return decodeHtmlEntities(value)
    .replace(/\b(advertisement|sponsored content|sign up for our newsletter)\b/gi, " ")
    .replace(/\b(function|return|var|let|const)\s*\(/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeScriptText(value = "") {
  const text = value.toLowerCase();
  const scriptSignals = ["fetch-start", "headers", "function(", "window.", "webpack", "push(", "this.params", "xmlhttprequest"];
  const signalCount = scriptSignals.filter((signal) => text.includes(signal)).length;
  const symbolRatio = (value.match(/[{};=<>]/g) || []).length / Math.max(value.length, 1);
  return signalCount >= 2 || symbolRatio > 0.08;
}

function scoreCandidate(candidate = "", priority = 0) {
  const text = normalizeArticleText(candidate);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = (text.match(/[.!?]/g) || []).length;
  const scriptPenalty = looksLikeScriptText(text) ? 10000 : 0;
  const boilerplatePenalty = /advertisement|subscribe|newsletter|cookie|privacy|terms|all rights reserved/i.test(text) ? 500 : 0;
  return priority + Math.min(text.length, 6000) + sentenceCount * 80 + wordCount * 4 - scriptPenalty - boilerplatePenalty;
}

function chooseBestTextCandidate(candidates) {
  return candidates
    .map((candidate) => ({ ...candidate, text: normalizeArticleText(candidate.text) }))
    .filter((candidate) => candidate.text.length >= 80 && !looksLikeScriptText(candidate.text))
    .sort((a, b) => scoreCandidate(b.text, b.priority) - scoreCandidate(a.text, a.priority))[0]?.text || "";
}

function ensureReadableArticle(article) {
  const text = normalizeArticleText(article.text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const partialButUsable = text.length >= 120 && wordCount >= 18 && !looksLikeScriptText(text);
  const listingPage = looksLikeListingPage({ title: article.title, text, hasArticleContainer: article.hasArticleContainer, url: article.url });
  if (!partialButUsable) {
    throw new Error("Readable article text was not found. The site may be blocking extraction or returning page scripts instead of news text.");
  }

  return {
    title: normalizeArticleText(article.title).slice(0, 220) || "Online article",
    text: text.slice(0, 12000),
    source: article.source,
    url: article.url,
    partial: wordCount < 45,
    warning: listingPage
      ? "Ky link duket si homepage/listing page, jo artikull i vetem. U mor tekst i pastruar, por per rezultat me te sakte perdor link direkt te nje lajmi."
      : wordCount < 45
        ? "U mor vetem tekst i pjesshem nga linku. Per rezultat me te sakte, ngjite tekstin e plote te artikullit."
        : "",
  };
}

function buildMetadataFallbackArticle({ title = "", description = "", looseText = "", source = "", url = "" }) {
  const cleanTitle = normalizeArticleText(stripHtml(title)).slice(0, 220) || "Online article";
  const cleanDescription = normalizeArticleText(description);
  const cleanLooseText = normalizeArticleText(looseText).slice(0, 900);
  const slugText = normalizeArticleText(
    new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .join(" ")
      .replace(/[-_]/g, " ")
  );
  const text = [cleanDescription, cleanLooseText, slugText ? `URL keywords: ${slugText}.` : ""]
    .filter(Boolean)
    .join(" ")
    .slice(0, 12000);

  if (!text) {
    throw new Error("Readable article text was not found. The site may be blocking extraction or returning page scripts instead of news text.");
  }

  return {
    title: cleanTitle,
    text,
    source,
    url,
    partial: true,
    warning: "Faqja nuk dha tekst te plote artikulli. U moren vetem metadata/tekst i pjesshem; per rezultat me te sakte ngjite tekstin e plote manualisht.",
  };
}

async function fetchArticleFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 FakeNewsSchoolProject/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    const urlObject = new URL(url);
    const slugTitle = normalizeArticleText(urlObject.pathname.split("/").filter(Boolean).join(" ").replace(/[-_]/g, " "));
    return {
      title: slugTitle || "Online article",
      text: `URL keywords: ${slugTitle || urlObject.hostname}.`,
      source: urlObject.hostname,
      url,
      partial: true,
      warning: `Portali nuk lejoi leximin e artikullit nga serveri lokal (status ${response.status}). U moren vetem fjalet nga URL-ja; per rezultat me te sakte ngjite tekstin e plote manualisht.`,
    };
  }

  const html = await response.text();
  const jsonLdArticle = extractJsonLdArticle(html);
  const title = jsonLdArticle.title || extractMetaContent(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const description = extractMetaContent(html, "og:description") || extractMetaContent(html, "description");
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || "";
  const hasArticleContainer = Boolean(articleMatch || jsonLdArticle.text);
  const articleParagraphText = extractParagraphsFromHtml(articleMatch);
  const pageParagraphText = extractParagraphsFromHtml(html);
  const looseText = extractLooseTextFromHtml(html);
  const text = chooseBestTextCandidate([
    { text: jsonLdArticle.text, priority: 3000 },
    { text: articleParagraphText, priority: 2500 },
    { text: pageParagraphText, priority: 1800 },
    { text: description, priority: 1200 },
    { text: looseText, priority: 700 },
  ]);

  try {
    return ensureReadableArticle({
      title: stripHtml(title),
      text,
      source: new URL(url).hostname,
      url,
      hasArticleContainer,
    });
  } catch {
    return buildMetadataFallbackArticle({
      title,
      description,
      looseText,
      source: new URL(url).hostname,
      url,
    });
  }
}

function predictWithPython({ headline, text }) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, ["ml/predict_naive_bayes.py"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
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
        reject(new Error(stderr || `Python predictor exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.write(JSON.stringify({ headline, text }));
    child.stdin.end();
  });
}

function runPythonTraining() {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, ["ml/train_naive_bayes.py"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
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
        reject(new Error(stderr || `Training exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ output: stdout.trim() });
      }
    });
  });
}

async function readTrainingReport() {
  try {
    return JSON.parse(await readFile(trainingReportPath, "utf8"));
  } catch {
    return {
      accuracy: 0,
      confusion_matrix: {},
      test_size: 0,
    };
  }
}

async function classifyWithMachineLearning({ headline = "", text = "", source = "", url = "" }, articles) {
  try {
    const result = await predictWithPython({ headline, text });
    const signals = analyzeCredibilitySignals({ headline, text, source, url });
    const calibrated = calibratePrediction(result, signals);
    const topTokens = calibrated.topEvidence?.map((item) => item.token).slice(0, 6).join(", ");
    const signalSummary = `Source: ${signals.sourceHost || "manual input"}. Trusted source: ${signals.trustedSource ? "yes" : "no"}. Reporting signals: ${signals.credibleSignals}. Red flags: ${signals.redFlags}.`;
    const uncertaintyNote = calibrated.warning ? ` Warning: ${calibrated.warning}` : "";
    return {
      label: calibrated.label,
      confidence: calibrated.confidence,
      probabilities: calibrated.probabilities,
      topEvidence: calibrated.topEvidence || [],
      explanation: `Naive Bayes first predicted ${result.label}, then the evidence gate returned ${calibrated.label}. ${signalSummary} Model test accuracy: ${result.accuracy}%. Strong evidence tokens: ${topTokens || "not enough known tokens"}.${uncertaintyNote}`,
      matches: [],
      modelName: "Evidence-Gated Naive Bayes v1.1",
    };
  } catch (error) {
    console.error(error);
    const fallback = classifyText({ headline, text }, articles);
    return {
      ...fallback,
      modelName: "Fallback Dataset Similarity + Keyword Rules",
      explanation: `${fallback.explanation} Python model fallback was used because ML prediction failed.`,
    };
  }
}

function groupDistribution(items) {
  const total = Math.max(items.length, 1);
  return labels.map((label) => ({
    name: label,
    value: Math.round((items.filter((item) => item.label === label).length / total) * 100),
  }));
}

function buildTrend(analyses, articles) {
  const source = analyses.length ? analyses : articles;
  const counts = new Map();

  source.slice(0, 250).forEach((item) => {
    const date = (item.date || "").slice(0, 10);
    if (!date) return;
    counts.set(date, (counts.get(date) || 0) + 1);
  });

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, count]) => ({ day: date.slice(5), count }));
}

function buildMonthlyConfidence(analyses) {
  const monthMap = new Map();
  analyses.forEach((item) => {
    const month = (item.date || "").slice(0, 7);
    if (!month) return;
    const current = monthMap.get(month) || { total: 0, count: 0 };
    current.total += Number(item.confidence || 0);
    current.count += 1;
    monthMap.set(month, current);
  });

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, value]) => ({ month, value: Math.round(value.total / value.count) }));
}

function timeAgo(dateText) {
  const then = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(then.valueOf())) return dateText;
  const minutes = Math.max(1, Math.round((Date.now() - then.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days > 30 ? dateText.slice(0, 10) : `${days} days ago`;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password || "")).digest("hex");
}

function sanitizeUser(user) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

app.get("/api/health", async (_req, res) => {
  const database = await readDatabase();
  res.json({
    status: "ok",
    database: process.env.DB_CLIENT === "mysql" ? "mysql" : "json",
    articles: database.articles.length,
    analyses: database.analyses.length,
  });
});

app.post("/api/login", async (req, res) => {
  const { email = "", password = "" } = req.body;
  const user = await findUserByEmail(email);

  if (!user || user.status !== "Active" || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  res.json({
    user: sanitizeUser(user),
    token: Buffer.from(`${user.email}:${Date.now()}`).toString("base64"),
  });
});

app.get("/api/dashboard", async (_req, res) => {
  const database = await readDatabase();
  const analyses = database.analyses.map(toAnalysisRow);
  const fakeCount = database.articles.filter((article) => article.label === "Fake").length;
  const realCount = database.articles.filter((article) => article.label === "Real").length;
  const averageConfidence = analyses.length
    ? Math.round(analyses.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / analyses.length)
    : 0;

  res.json({
    stats: [
      { title: "Dataset Articles", value: database.articles.length.toLocaleString(), sub: "Loaded from CSV database", icon: "Newspaper" },
      { title: "Avg Confidence", value: `${averageConfidence}%`, sub: "Saved analysis average", icon: "WandSparkles" },
      { title: "Fake Records", value: fakeCount.toLocaleString(), sub: "Imported fake news rows", icon: "AlertTriangle" },
      { title: "Real Records", value: realCount.toLocaleString(), sub: "Imported true news rows", icon: "Activity" },
    ],
    recentPredictions: analyses.slice(0, 6).map((item) => ({ ...item, time: timeAgo(item.date) })),
    distributionData: groupDistribution(database.articles),
    trendData: buildTrend(analyses, database.articles),
    monthlyConfidence: buildMonthlyConfidence(analyses),
    notifications: database.notifications,
    users: database.users,
  });
});

app.get("/api/model/report", async (_req, res) => {
  const database = await readDatabase();
  const report = await readTrainingReport();
  const byLabel = labels.map((label) => ({
    label,
    count: database.articles.filter((article) => article.label === label).length,
  }));

  res.json({
    algorithm: "Python Multinomial Naive Bayes",
    accuracy: Math.round((report.accuracy || 0) * 10000) / 100,
    testSize: report.test_size || 0,
    confusionMatrix: report.confusion_matrix || {},
    dataset: {
      total: database.articles.length,
      byLabel,
    },
  });
});

app.post("/api/model/retrain", async (_req, res) => {
  try {
    const result = await runPythonTraining();
    const report = await readTrainingReport();
    res.json({
      status: "trained",
      result,
      accuracy: Math.round((report.accuracy || 0) * 10000) / 100,
      report,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Model training failed.", detail: error.message });
  }
});

app.get("/api/history", async (_req, res) => {
  const database = await readDatabase();
  res.json({ history: database.analyses.map(toAnalysisRow) });
});

app.get("/api/articles", async (req, res) => {
  const database = await readDatabase();
  const query = String(req.query.q || "").toLowerCase();
  const label = String(req.query.label || "All");
  const limit = Math.min(Number(req.query.limit || 25), 100);

  const articles = database.articles
    .filter((article) => label === "All" || article.label === label)
    .filter((article) => !query || `${article.title} ${article.subject} ${article.text}`.toLowerCase().includes(query))
    .slice(0, limit)
    .map(({ text, ...article }) => ({ ...article, preview: text.slice(0, 180) }));

  res.json({ articles, total: articles.length });
});

app.post("/api/fetch-url", async (req, res) => {
  const { url = "" } = req.body;

  if (!isHttpUrl(url)) {
    return res.status(400).json({ message: "Please provide a valid http or https URL." });
  }

  try {
    const article = await fetchArticleFromUrl(url);
    res.json(article);
  } catch (error) {
    console.error(error);
    res.status(502).json({ message: "Unable to fetch readable article content from this URL.", detail: error.message });
  }
});

app.post("/api/analyze", async (req, res) => {
  const { headline = "", source = "", url = "", text = "", model = "Python Multinomial Naive Bayes v1.0", language = "English", save = true } = req.body;
  const database = await readDatabase();
  let finalHeadline = headline;
  let finalText = text;
  let finalSource = source || "manual input";

  if (isHttpUrl(url || source) && finalText.trim().length < 200) {
    try {
      const fetched = await fetchArticleFromUrl(url || source);
      finalHeadline = finalHeadline || fetched.title;
      finalText = fetched.text;
      finalSource = fetched.source;
    } catch (error) {
      console.error(error);
      return res.status(422).json({
        message: "Nuk u gjet tekst i lexueshem lajmi nga ky link. Faqja mund te ktheje JavaScript/ads ne vend te artikullit. Ngjite tekstin e lajmit manualisht ose provo link tjeter.",
      });
    }
  }

  if (looksLikeScriptText(finalText)) {
    return res.status(422).json({
      message: "Teksti duket si kod JavaScript i faqes, jo si artikull lajmi. Kliko Clear, provo Fetch URL perseri, ose ngjite tekstin real te lajmit manualisht.",
    });
  }

  const result = await classifyWithMachineLearning({ headline: finalHeadline, text: finalText, source: finalSource, url }, database.articles);

  const item = {
    id: `AN-${Date.now()}`,
    title: finalHeadline || finalText.slice(0, 80) || "Untitled article",
    source: finalSource,
    label: result.label,
    confidence: result.confidence,
    model: result.modelName || model,
    date: new Date().toISOString().slice(0, 16).replace("T", " "),
    language,
    matches: result.matches,
  };

  if (save) {
    await saveAnalysis(item, {
      id: Date.now(),
      title: "Prediction completed",
      text: `A new article was classified as ${item.label} with ${item.confidence}% confidence.`,
      time: "Just now",
      unread: true,
    });
  }

  res.json({ ...result, item, headline: finalHeadline, text: finalText, source: finalSource });
});

ensureDatabaseSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend server listening at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database schema check failed.", error);
    process.exit(1);
  });
