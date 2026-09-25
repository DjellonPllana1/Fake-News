/**
 * ============================================================================
 * KONTROLLORI I ANALIZËS SË LAJMEVE (analysisController.js)
 * ============================================================================
 * Qëllimi:
 * Ky është kontrollori më i rëndësishëm për përdoruesit e thjeshtë.
 * Është "porta" ku vijnë artikujt që njerëzit duan t'i kontrollojnë për vërtetësi.
 * 
 * Çfarë bën me fjalë të thjeshta:
 * 1. Përdoruesi shkruan një lajm ose vendos një link (URL) në faqe.
 * 2. Ky skedar e merr atë kërkesë dhe ia kalon "motorit të analizës" (analysisService).
 * 3. Motori i analizës e kontrollon tekstin me Inteligjencë Artificiale dhe rregulla logjike.
 * 4. Ky skedar ia kthen rezultatin mbrapsht përdoruesit (p.sh. "Ky lajm ka 85% besueshmëri").
 */

import { sendSuccess } from "../utils/apiResponse.js";
import { analyzeArticle, fetchArticlePreview, getAnalysisHistory, getDatasetArticles } from "../services/analysisService.js";
import { validateArticlesQuery, validateHistoryQuery } from "../utils/validation.js";

/**
 * 1. ANALIZO ARTIKULLIN
 * Ky funksion thirret kur përdoruesi klikon butonin "Analizo Lajmin".
 * Merr tekstin e artikullit, autorin, titullin etj., dhe nxjerr rezultatin e plotë:
 * - A është i vërtetë, i rremë, apo i pasigurt?
 * - Sa është nota e besueshmërisë (nga 0 deri në 100)?
 * - Cilat fjali duken të dyshimta apo manipulative?
 */
export async function analyze(req, res) {
  // Dërgon të dhënat e kontrolluara te shërbimi i analizës
  const data = await analyzeArticle(req.validated);

  // Kthen përgjigjen me rezultatet e analizës te përdoruesi
  return sendSuccess(res, {
    data,
    message: "Article analyzed successfully.",
  });
}

/**
 * 2. SHKARKO PËRMBAJTJEN NGA NJË LINK (URL)
 * Përdoruesi nuk ka nevojë të bëjë "Copy-Paste" të gjithë artikullit.
 * Ai thjesht mund të vendosë linkun e një portali (p.sh. https://shembull.com/lajmi).
 * Ky funksion shkon te ajo faqe interneti, nxjerr automatikisht titullin dhe tekstin,
 * dhe ia shfaq përdoruesit në ekran gati për analizë.
 */
export async function fetchUrl(req, res) {
  const data = await fetchArticlePreview(req.validated.url);

  return sendSuccess(res, {
    data,
    message: "Article content fetched successfully.",
  });
}

/**
 * 3. HISTORIKU I ANALIZAVE
 * Shfaq analizat e fundit që janë bërë në faqe, në mënyrë që përdoruesi
 * të mund të shohë rezultatet e kaluara pa pasur nevojë t'i analizojë sërish.
 */
export async function history(req, res) {
  // Filtron kërkesën (p.sh. sa analiza të shfaqen, nga cila datë, etj.)
  const filters = validateHistoryQuery(req.query);
  const data = await getAnalysisHistory(filters);

  return sendSuccess(res, {
    data,
    message: "Analysis history loaded successfully.",
  });
}

/**
 * 4. ARTIKUJT NGA BAZA E TË DHËNAVE
 * Merr artikujt model që ndodhen të ruajtur në sistem.
 * Kjo ndihmon përdoruesit të shohin shembuj të lajmeve të vërteta dhe të rreme.
 */
export async function articles(req, res) {
  const filters = validateArticlesQuery(req.query);
  const data = await getDatasetArticles(filters);

  return sendSuccess(res, {
    data,
    message: "Dataset articles loaded successfully.",
  });
}
