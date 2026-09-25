/**
 * ============================================================================
 * VEGLAT PËR PËRPUNIMIN E TEKSTIT (text.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përmban funksione ndihmëse që pastrojnë dhe përgatisin tekstin
 * përpara se të fillojë analiza me inteligjencë artificiale.
 * 
 * Si funksionon me fjalë të thjeshta:
 * - STOPWORDS: Lista e fjalëve të thjeshta lidhëse (si "the", "and", "is")
 *   të cilat injorohen sepse nuk mbartin ndonjë kuptim specifik për lajmin.
 * - stripHtml: Pastron kodin HTML të uebit duke mbajtur vetëm tekstin e pastër.
 * - splitSentences: E ndan krejt artikullin në fjali të veçanta.
 * - buildExtractiveSummary: Zgjedh fjalitë më të rëndësishme për të krijuar një përmbledhje të shkurtër.
 * - extractKeywordCandidates: Gjen fjalët më të përsëritura dhe më domethënëse (Keywords).
 */

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "into", "is", "it", "of", "on", "or", "that",
  "the", "their", "this", "to", "was", "were", "with", "will", "would",
  "about", "after", "before", "been", "being", "over", "under", "your",
  "they", "them", "than", "then", "there", "what", "when", "where",
  "which", "who", "why", "how",
]);

/**
 * Pastron hapësirat e panevojshme (dy ose më shumë hapësira bëhen një).
 */
export function normalizeWhitespace(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

/**
 * Heq linqet e internetit (http/https) nga trupi i tekstit.
 */
export function removeUrls(value = "") {
  return String(value || "").replace(/https?:\/\/\S+/gi, " ");
}

/**
 * Shndërron kodet speciale të internetit (p.sh. &amp; në &, &quot; në thonjëza).
 */
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

/**
 * Pastron krejt kodin HTML, stilet dhe skriptet, duke lënë vetëm tekstin e lajmit.
 */
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

/**
 * Nëse artikulli nuk ka titull, merr fjalinë e parë dhe e përdor si titull.
 */
export function buildHeadlineFromText(text = "") {
  const cleaned = normalizeWhitespace(text);

  if (!cleaned) {
    return "Untitled Article";
  }

  const sentence = cleaned.split(/[.!?]/)[0] || cleaned;
  return sentence.slice(0, 120).trim();
}

/**
 * Ndan tekstin e gjatë në fjali të veçanta duke u bazuar te pika (.), pikëçuditja (!) dhe pikëpyetja (?).
 */
export function splitSentences(text = "") {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * Krijon një përmbledhje të shkurtër me deri në 3 fjalitë kryesore të artikullit.
 */
export function buildExtractiveSummary({ headline = "", text = "" }, maxSentences = 3) {
  const sentences = splitSentences(text).filter((sentence) => sentence.length > 35);

  if (!sentences.length) {
    const fallback = normalizeWhitespace(`${headline}. ${text}`).slice(0, 280);
    return fallback || "No summary available.";
  }

  const selected = sentences.slice(0, maxSentences).join(" ");
  return normalizeWhitespace(selected).slice(0, 420);
}

/**
 * Zbulon fjalët më të rëndësishme të tekstit (fjalët kyçe) duke numëruar sa shpesh përsëriten.
 */
export function extractKeywordCandidates(text = "", limit = 8) {
  const cleaned = normalizeWhitespace(removeUrls(text).toLowerCase()).replace(/[^a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  const counts = new Map();
  const firstSeen = new Map();

  words.forEach((word, index) => {
    // Injorojmë fjalët shumë të shkurtra (nën 4 shkronja), fjalët lidhëse dhe numrat
    if (word.length < 4 || STOPWORDS.has(word) || /^\d+$/.test(word)) {
      return;
    }

    counts.set(word, (counts.get(word) || 0) + 1);

    if (!firstSeen.has(word)) {
      firstSeen.set(word, index);
    }
  });

  // I rendisim nga më e shpeshta te më e rralla dhe kthejmë deri në 8 fjalë
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || firstSeen.get(a[0]) - firstSeen.get(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}
