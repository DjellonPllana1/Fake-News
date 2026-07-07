import { AppError } from "../utils/appError.js";
import { buildHeadlineFromText, decodeHtmlEntities, normalizeWhitespace, stripHtml } from "../utils/text.js";
import { getSourceReputation as lookupSourceReputation, isTrustedSource as lookupTrustedSource } from "./sourceReputationService.js";

export function isHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getHostname(value = "") {
  try {
    const hostname = new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return "";
  }
}

export function isTrustedSource(value = "") {
  return lookupTrustedSource(value);
}

export function getSourceReputation(value = "") {
  return lookupSourceReputation(value);
}

export function looksLikeScriptText(value = "") {
  const text = String(value || "").toLowerCase();
  const scriptSignals = ["fetch-start", "headers", "function(", "window.", "webpack", "push(", "this.params", "xmlhttprequest"];
  const signalCount = scriptSignals.filter((signal) => text.includes(signal)).length;
  const symbolRatio = (String(value || "").match(/[{};=<>]/g) || []).length / Math.max(String(value || "").length, 1);
  return signalCount >= 2 || symbolRatio > 0.08;
}

function extractMetaContent(html, property) {
  const tags = html.match(/<meta[^>]+>/gi) || [];
  const tag = tags.find((item) => new RegExp(`(?:property|name)=["']${property}["']`, "i").test(item));
  const content = tag?.match(/content=["']([^"']+)["']/i)?.[1] || "";
  return normalizeWhitespace(decodeHtmlEntities(content));
}

function normalizeAuthorValue(author) {
  if (!author) {
    return "";
  }

  if (Array.isArray(author)) {
    return author
      .map(normalizeAuthorValue)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
  }

  if (typeof author === "object") {
    return normalizeWhitespace(decodeHtmlEntities(author.name || author.alternateName || author.author || ""));
  }

  return normalizeWhitespace(decodeHtmlEntities(String(author)));
}

function extractPublishedAtFromMeta(html = "") {
  const candidates = [
    "article:published_time",
    "article:modified_time",
    "pubdate",
    "publish-date",
    "date",
    "dc.date",
    "parsely-pub-date",
  ];

  for (const candidate of candidates) {
    const value = extractMetaContent(html, candidate);

    if (value) {
      return value;
    }
  }

  return "";
}

function flattenJsonLd(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (typeof value !== "object") {
    return [];
  }

  return [value, ...flattenJsonLd(value["@graph"])];
}

function extractJsonLdArticle(html = "") {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(normalizeWhitespace(block[1]));
      const nodes = flattenJsonLd(parsed);
      const article = nodes.find((node) => {
        const type = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        return type.some((item) => ["NewsArticle", "Article", "ReportageNewsArticle"].includes(item));
      });

      if (article) {
        return {
          title: normalizeWhitespace(decodeHtmlEntities(article.headline || article.name || "")),
          text: normalizeWhitespace(decodeHtmlEntities(article.articleBody || article.description || "")),
          author: normalizeAuthorValue(article.author),
          publishedAt: normalizeWhitespace(decodeHtmlEntities(article.datePublished || article.dateCreated || article.dateModified || "")),
        };
      }
    } catch {
      continue;
    }
  }

  return { title: "", text: "", author: "", publishedAt: "" };
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

function normalizeArticleText(value = "") {
  return normalizeWhitespace(
    decodeHtmlEntities(value)
      .replace(/\b(advertisement|sponsored content|sign up for our newsletter)\b/gi, " ")
      .replace(/\b(function|return|var|let|const)\s*\(/gi, " ")
  );
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
    const paragraph = normalizeArticleText(stripHtml(match[1]));
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

function scoreCandidate(text = "", priority = 0) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = (text.match(/[.!?]/g) || []).length;
  const scriptPenalty = looksLikeScriptText(text) ? 10000 : 0;
  const boilerplatePenalty = /advertisement|subscribe|newsletter|cookie|privacy|terms|all rights reserved/i.test(text) ? 500 : 0;
  return priority + Math.min(text.length, 6000) + sentenceCount * 80 + wordCount * 4 - scriptPenalty - boilerplatePenalty;
}

function chooseBestTextCandidate(candidates = []) {
  return candidates
    .map((candidate) => ({ ...candidate, text: normalizeArticleText(candidate.text) }))
    .filter((candidate) => candidate.text.length >= 80 && !looksLikeScriptText(candidate.text))
    .sort((a, b) => scoreCandidate(b.text, b.priority) - scoreCandidate(a.text, a.priority))[0]?.text || "";
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

  return {
    title: cleanTitle || buildHeadlineFromText(text),
    text,
    source,
    url,
    author: "",
    publishedAt: "",
    partial: true,
    warning: "The site did not expose full article text. The result uses partial content and metadata, so confidence may be lower.",
  };
}

function ensureReadableArticle(article) {
  const text = normalizeArticleText(article.text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const listingPage = looksLikeListingPage({ title: article.title, text, hasArticleContainer: article.hasArticleContainer, url: article.url });

  if (text.length < 120 || wordCount < 18 || looksLikeScriptText(text)) {
    throw new Error("Readable article text was not found.");
  }

  return {
    title: normalizeArticleText(article.title).slice(0, 220) || "Online article",
    text: text.slice(0, 12000),
    source: article.source,
    url: article.url,
    author: normalizeWhitespace(article.author || ""),
    publishedAt: normalizeWhitespace(article.publishedAt || ""),
    partial: wordCount < 45,
    warning: listingPage
      ? "This URL looks like a listing page instead of a single article, so the extraction may be less precise."
      : wordCount < 45
        ? "Only a short article excerpt was extracted from the URL. Paste full article text for stronger confidence."
        : "",
  };
}

function buildUrlFallbackArticle(url, statusCode) {
  const urlObject = new URL(url);
  const slugTitle = normalizeArticleText(urlObject.pathname.split("/").filter(Boolean).join(" ").replace(/[-_]/g, " "));
  return {
    title: slugTitle || "Online article",
    text: `URL keywords: ${slugTitle || urlObject.hostname}.`,
    source: urlObject.hostname,
    url,
    author: "",
    publishedAt: "",
    partial: true,
    warning: `The remote site returned status ${statusCode}. The platform fell back to URL metadata only.`,
  };
}

export async function fetchArticleFromUrl(url) {
  if (!isHttpUrl(url)) {
    throw new AppError("Please provide a valid http or https article URL.", 400, "INVALID_URL");
  }

  let response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 FakeNewsPlatform/2.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(Number(process.env.FETCH_TIMEOUT_MS || 15000)),
    });
  } catch (error) {
    throw new AppError(
      "Unable to reach the remote article URL from this server environment.",
      502,
      "REMOTE_FETCH_FAILED",
      error.message
    );
  }

  if (!response.ok) {
    return buildUrlFallbackArticle(url, response.status);
  }

  const html = await response.text();
  const jsonLdArticle = extractJsonLdArticle(html);
  const title = jsonLdArticle.title || extractMetaContent(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const description = extractMetaContent(html, "og:description") || extractMetaContent(html, "description");
  const author = jsonLdArticle.author || extractMetaContent(html, "author") || extractMetaContent(html, "article:author");
  const publishedAt = jsonLdArticle.publishedAt || extractPublishedAtFromMeta(html);
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
      author,
      publishedAt,
      hasArticleContainer,
    });
  } catch {
    const fallback = buildMetadataFallbackArticle({
      title,
      description,
      looseText,
      source: new URL(url).hostname,
      url,
    });

    fallback.author = author;
    fallback.publishedAt = publishedAt;

    if (!fallback.text) {
      throw new AppError(
        "Unable to fetch readable article content from this URL. Paste article text manually or try a direct article link.",
        502,
        "ARTICLE_EXTRACTION_FAILED"
      );
    }

    return fallback;
  }
}
