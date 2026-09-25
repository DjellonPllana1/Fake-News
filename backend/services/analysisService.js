/**
 * ============================================================================
 * SHËRBIMI KRYESOR I ANALIZËS SË LAJMEVE (analysisService.js)
 * ============================================================================
 * Qëllimi:
 * Ky është "truri qendror" i gjithë projektit Verity Lens!
 * Këtu bashkohen të gjitha teknologjitë për të zbuluar nëse një lajm është i vërtetë apo i rremë.
 * 
 * Si funksionon procesi i analizës (Hap pas Hapi):
 * 1. PËRGATITJA: Nëse përdoruesi dha vetëm një link (URL), sistemi shkon te ajo faqe
 *    dhe shkarkon tekstin e lajmit, autorin dhe titullin.
 * 2. INTELIGJENCA ARTIFICIALE (AI/Machine Learning): Modeli i trajnuar me mijëra lajme
 *    lexon tekstin dhe llogarit sa ngjan ky lajm me lajmet e rreme të njohura.
 * 3. ANALIZA GJUHËSORE & RREGULLAT (Text Intelligence): Kontrollohet stili i të shkruarit:
 *    a ka fjalë sensacionale, shkronja të mëdha (bërtitje), klikime mashtruese (clickbait),
 *    apo mungesë të autorit dhe datës.
 * 4. KONTROLLI I PROVAVE (Evidence Verification): Sistemi kërkon në bazën e burimeve
 *    të besueshme për të parë a mbështetet apo përgënjeshtrohet ky lajm nga fakte reale.
 * 5. NOTA PËRFUNDIMTARE E BESUESHMËRISË (Trust Score 0-100): Duke kombinuar AI-në,
 *    provat, reputacionin e portalit dhe analizën e tekstit, krijohet një notë përfundimtare.
 * 6. RUAJTJA DHE REZULTATI: Rezultati ruhet në databazë dhe i dërgohet përdoruesit
 *    bashkë me një shpjegim të kuptueshëm dhe rekomandim (p.sh. "Kujdes, mos e shpërndaj!").
 */

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

/**
 * Funksion ndihmës: Krijon një kod unik për çdo analizë (p.sh. "AN-1718293-452").
 */
function buildAnalysisId() {
  return `AN-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

/**
 * Funksion ndihmës: Krijon një njoftim të shkurtër për përdoruesin
 * kur analiza përfundon me sukses.
 */
function buildNotification(item) {
  return {
    id: Date.now(),
    title: "Article analyzed",
    text: `${item.label} result saved for "${item.title.slice(0, 80)}" at ${item.confidence}% confidence.`,
    time: "Just now",
    unread: true,
  };
}

/**
 * PARAPAMJA E ARTIKULLIT NGA LINKU (URL)
 * Kur përdoruesi fut linkun e një portali lajmesh, ky funksion:
 * 1. Shkarkon përmbajtjen nga interneti
 * 2. Kontrollon reputacionin e atij portali (a njihet si portal serioz apo mashtrues)
 * 3. Krijon një përmbledhje të shkurtër me 2-3 fjali kryesore
 */
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

/**
 * FUNKSIONI KRYESOR: ANALIZON ARTIKULLIN
 * Këtu kalon çdo lajm për t'u shqyrtuar nga të gjitha këndvështrimet.
 */
export async function analyzeArticle(payload) {
  // Gjejmë linkun nëse përdoruesi e ka dhënë si burim
  const resolvedUrl = payload.url || (isHttpUrl(payload.source) ? payload.source : "");
  let finalHeadline = payload.headline;
  let finalText = payload.text;
  let finalSource = payload.source || "Manual input";
  let finalAuthor = payload.author || "";
  let finalPublishedAt = payload.publishedAt || "";
  let fetchWarning = "";

  // Nëse përdoruesi dha një link dhe nuk shkroi tekst, e shkarkojmë tekstin automatikisht nga uebi
  if (resolvedUrl && (!finalText || finalText.length < 180)) {
    const fetched = await fetchArticleFromUrl(resolvedUrl);
    finalHeadline = finalHeadline || fetched.title;
    finalText = finalText || fetched.text;
    finalSource = fetched.source || finalSource;
    finalAuthor = finalAuthor || fetched.author || "";
    finalPublishedAt = finalPublishedAt || fetched.publishedAt || "";
    fetchWarning = fetched.warning || "";
  }

  // Sigurohemi që teksti të mos jetë tepër i shkurtër (duhen të paktën 40 karaktere)
  if (!finalText || finalText.trim().length < 40) {
    throw new AppError("Nuk ka mjaftueshëm tekst të lexueshëm për të analizuar artikullin.", 422, "ARTICLE_TEXT_REQUIRED");
  }

  // Kontrollojmë nëse teksti duket si kod programimi apo gabim faqeje në vend të lajmit
  if (looksLikeScriptText(finalText)) {
    throw new AppError(
      "Teksti i dërguar nuk duket si artikull lajmesh, por si kod uebi. Ju lutem vendosni tekstin e vërtetë të lajmit.",
      422,
      "ARTICLE_TEXT_INVALID"
    );
  }

  // 1. INTELIGJENCA ARTIFICIALE: Parashikimi matematikor i modelit AI
  const prediction = await predictArticle({
    headline: finalHeadline,
    text: finalText,
    source: finalSource,
    url: resolvedUrl,
  });

  // 2. ANALIZA E TEKSTIT: Kontrollon titullin, klikimet mashtruese, ndjenjat, fjalët kyçe
  const intelligence = analyzeArticleIntelligence({
    headline: finalHeadline,
    text: finalText,
    source: finalSource,
    url: resolvedUrl,
    author: finalAuthor,
    publishedAt: finalPublishedAt,
    mlResult: prediction,
  });

  // 3. KONTROLLI I PROVAVE: Shikon a përputhet lajmi me faktet nga burime të verifikuara
  const evidence = await verifyArticleEvidence({
    headline: finalHeadline,
    text: finalText,
    source: finalSource,
    url: resolvedUrl,
  });

  // 4. PËRSHTATJA ME PROVAT: Korrigjon vlerësimin në varësi të fakteve që u gjetën
  const evidenceAdjusted = applyEvidenceToCredibility({
    baseCredibilityScore: intelligence.credibilityScore,
    currentLabel: intelligence.label,
    evidenceReport: evidence,
  });

  // 5. NOTA E BESUESHMËRISË: Llogarit pikët përfundimtare nga 0 deri në 100
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

  // Kontrollojmë reputacionin e portalit nga vjen lajmi
  const sourceReputation = getSourceReputation(resolvedUrl || finalSource);
  const finalLabel = normalizeResultLabel(evidenceAdjusted.label);

  // Ndërtojmë shpjegimin përfundimtar në mënyrë që përdoruesi të kuptojë PSE u mor ky vendim
  const finalExplanation = [
    intelligence.explanation,
    evidence.hasEvidence
      ? `Verifikimi gjeti ${evidence.supportedClaimsCount} pretendime të mbështetura, ${evidence.contradictedClaimsCount} të përgënjeshtruara, dhe ${evidence.unverifiedClaimsCount} të paverifikuara me ${Math.round(
          evidence.evidenceConfidence * 100
        )}% besueshmëri provash.`
      : evidence.message,
  ]
    .filter(Boolean)
    .join(" ");

  // Këshilla ose rekomandimi për lexuesin
  const finalRecommendation = evidence.hasEvidence
    ? `${intelligence.recommendation} Rishikoni raportin e provave para se ta shpërndani artikullin.`
    : `${intelligence.recommendation} Nuk u gjetën prova të mjaftueshme nga burime të sigurta, prandaj këshillohet kontroll manual.`;

  // Mbledhim të gjitha rezultatet në një paketë të vetme të strukturuar
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

  // E ruajmë analizën në databazë (përveç nëse është kërkuar të mos ruhet)
  if (payload.save !== false) {
    await saveAnalysis(analysis, buildNotification(analysis));
  }

  // Ia kthejmë rezultatin përfundimtar faqes për t'u shfaqur me grafikë të bukur
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

/**
 * MERR HISTORIKUN E ANALIZAVE ME MUNDËSI KËRKIMI
 * Mundëson kërkimin e artikujve të kaluar sipas fjalëve kyçe, autorit, temës ose rezultatit.
 */
export async function getAnalysisHistory({ search = "", label = "", limit = 50 } = {}) {
  const database = await readDatabase();
  const filtered = database.analyses
    .map(toAnalysisRow)
    .filter((item) => !label || normalizeResultLabel(item.label) === normalizeResultLabel(label))
    .filter((item) => {
      if (!search) {
        return true;
      }

      // Kërkon brenda titullit, përmbledhjes, provave, autorit dhe reputacionit
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

/**
 * MERR ARTIKUJT MODEL NGA DATASETI
 * Kthen artikujt e ruajtur në bazën e të dhënave që shërbejnë si referencë ose trajnim.
 */
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
