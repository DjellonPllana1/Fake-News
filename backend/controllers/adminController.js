/**
 * ============================================================================
 * KONTROLLORI I ADMINISTRATORIT (adminController.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar shërben si "paneli i komandimit" për personat që menaxhojnë sistemin (Administratorët).
 * Këtu vijnë të gjitha kërkesat që bëhen nga faqja e administratorit, si p.sh:
 * - Shikimi i përdoruesve dhe ndryshimi i roleve të tyre
 * - Menaxhimi i lajmeve në bazën e të dhënave (dataset)
 * - Ritrajnimi i Inteligjencës Artificiale (AI) me lajme të reja
 * - Shkarkimi i të dhënave në format Excel/CSV
 * - Kontrolli i gjendjes dhe shëndetit të serverit
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur administratori klikon një buton në faqe (p.sh. "Shiko Përdoruesit"),
 * ky skedar e pranon kërkesën (req), thërret shërbimin përkatës që merr të dhënat nga databaza,
 * dhe ia kthen përgjigjen mbrapsht faqes në mënyrë të pastër (res).
 */

import {
  deleteAdminAnalysis,
  deleteAdminDatasetArticle,
  downloadAdminDatasetCsv,
  getAdminAnalyses,
  getAdminApiLogs,
  getAdminConfiguration,
  getAdminDashboard,
  getAdminDatasets,
  getAdminDiagnostics,
  getAdminModels,
  getAdminUsers,
  retrainAdminModels,
  updateAdminConfigurationValues,
  updateAdminUser,
} from "../services/adminService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { validateArticlesQuery, validateHistoryQuery } from "../utils/validation.js";

/**
 * Funksion ndihmës: Krijon një tekst me orën dhe datën e tanishme.
 * Përdoret për t'i vënë emër skedarit kur administratori shkarkon të dhëna,
 * në mënyrë që skedari të ketë një emër unik me kohën e saktë (p.sh. 2026-09-25-14-30-00).
 */
function timestampSlug() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/**
 * 1. PANELI KRYESOR I ADMINISTRATORIT (Dashboard)
 * Merr statistikat e përgjithshme për t'i shfaqur te faqja kryesore e adminit:
 * p.sh. sa artikuj janë analizuar gjithsej, sa përdorues kemi, etj.
 */
export async function adminDashboard(req, res) {
  // Merr të dhënat përmbledhëse duke përdorur kufizimet e kërkuara nga faqja
  const data = await getAdminDashboard({
    datasetLimit: req.query.datasetLimit,
    analysisLimit: req.query.analysisLimit,
  });

  // Ia kthen të dhënat faqes së bashku me një mesazh suksesi
  return sendSuccess(res, {
    data,
    message: "Admin dashboard loaded successfully.",
  });
}

/**
 * 2. LISTA E PËRDORUESVE
 * Shfaq të gjithë personat që janë të regjistruar në këtë aplikacion.
 */
export async function adminUsers(req, res) {
  // Kërkon listën e përdoruesve nga databaza
  const data = await getAdminUsers();

  // Kthen listën e përdoruesve te faqja
  return sendSuccess(res, {
    data,
    message: "Users loaded successfully.",
  });
}

/**
 * 3. NDRYSHIMI I TË DHËNAVE TË NJË PËRDORUESI
 * Përdoret kur admini dëshiron të ndryshojë rolin e një përdoruesi
 * (p.sh. nga përdorues i thjeshtë në administrator) ose të përditësojë profilin e tij.
 */
export async function adminUpdateUser(req, res) {
  const data = await updateAdminUser({
    actorEmail: req.user.email, // Emaili i administratorit që po bën ndryshimin
    email: req.params.email,    // Emaili i përdoruesit që po modifikohet
    updates: req.body || {},    // Të dhënat e reja që po ruhen
  });

  return sendSuccess(res, {
    data,
    message: "User updated successfully.",
  });
}

/**
 * 4. LISTA E ARTIKUJVE TË TRAJNIMIT (Dataset)
 * Merr lajmet e ruajtura në sistem që shërbejnë si shembuj për inteligjencën artificiale.
 * Këto lajme janë të ndara në "të vërteta" dhe "të rreme".
 */
export async function adminDatasets(req, res) {
  // Kontrollon nëse përdoruesi ka kërkuar ndonjë filtër (p.sh. kërko sipas titullit ose datës)
  const filters = validateArticlesQuery(req.query);
  const data = await getAdminDatasets(filters);

  return sendSuccess(res, {
    data,
    message: "Dataset articles loaded successfully.",
  });
}

/**
 * 5. FSHIRJA E NJË ARTIKULLI NGA DATASETI
 * Kur administratori sheh një lajm të pasaktë ose të panevojshëm në bazën e të dhënave,
 * ky funksion mundëson fshirjen e tij me anë të numrit identifikues (articleId).
 */
export async function adminDeleteDataset(req, res) {
  const data = await deleteAdminDatasetArticle(req.params.articleId);

  return sendSuccess(res, {
    data,
    message: "Dataset article deleted successfully.",
  });
}

/**
 * 6. SHKARKIMI I ARTIKUJVE NË FORMAT CSV (EXCEL)
 * Ky funksion i mundëson administratorit të shkarkojë deri në 5,000 artikuj
 * si një skedar tabele (.csv) që mund të hapet me Microsoft Excel.
 */
export async function adminDownloadDatasets(req, res) {
  const filters = validateArticlesQuery(req.query);
  filters.limit = 5000; // Vendosim tavanin e shkarkimit në 5000 rreshta
  const content = await downloadAdminDatasetCsv(filters);

  // I tregojmë shfletuesit të internetit (browser-it) që kjo është një tabelë për t'u shkarkuar
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="verity-lens-datasets-${timestampSlug()}.csv"`);

  // Dërgon përmbajtjen e skedarit te kompjuteri i administratorit
  return res.status(200).send(content);
}

/**
 * 7. HISTORIKU I ANALIZAVE
 * Shfaq listën e të gjitha analizave të lajmeve që janë kryer ndonjëherë në sistem.
 * Kjo ndihmon adminin të shohë se çfarë artikujsh po kontrollojnë njerëzit.
 */
export async function adminAnalyses(req, res) {
  const filters = validateHistoryQuery(req.query);
  const data = await getAdminAnalyses(filters);

  return sendSuccess(res, {
    data,
    message: "Admin analysis history loaded successfully.",
  });
}

/**
 * 8. FSHIRJA E NJË ANALIZE
 * Fshin një analizë specifike nga historiku i sistemit.
 */
export async function adminDeleteAnalysis(req, res) {
  const data = await deleteAdminAnalysis(req.params.analysisId);

  return sendSuccess(res, {
    data,
    message: "Analysis deleted successfully.",
  });
}

/**
 * 9. INFORMACIONI MBI MODELET E INTELIGJENCËS ARTIFICIALE (AI)
 * Shfaq të dhëna mbi modelet e inteligjencës artificiale që dallojnë lajmet e rreme:
 * p.sh. sa për qind të sakta janë, kur janë trajnuar për herë të fundit, etj.
 */
export async function adminModels(req, res) {
  const data = await getAdminModels();

  return sendSuccess(res, {
    data,
    message: "Admin model view loaded successfully.",
  });
}

/**
 * 10. RITRAJNIMI I MODELIT TË INTELIGJENCËS ARTIFICIALE
 * Kur në sistem shtohen shumë lajme të reja, modeli i AI duhet të "mësojë" sërish
 * nga e para për t'u bërë më i zgjuar. Ky funksion nis pikërisht këtë trajnim.
 */
export async function adminRetrainModels(req, res) {
  const data = await retrainAdminModels();

  return sendSuccess(res, {
    data,
    message: "Models retrained successfully.",
  });
}

/**
 * 11. REGJISTRI I KËRKESAVE (API Logs)
 * Shfaq regjistrin e veprimeve dhe thirrjeve që vijnë në server.
 * I ngjashëm me një libër shënimesh ku shënohet kush, kur dhe çfarë kërkoi nga serveri.
 */
export async function adminApiLogs(req, res) {
  const data = await getAdminApiLogs(req.query.limit);

  return sendSuccess(res, {
    data,
    message: "API logs loaded successfully.",
  });
}

/**
 * 12. DIAGNOSTIKIMI DHE GJENDJA E SISTEMIT
 * Kontrollon gjendjen e pajisjes dhe serverit:
 * sa memorie po përdoret, a po punon databaza siç duhet, a ka ndonjë gabim, etj.
 */
export async function adminDiagnostics(req, res) {
  const data = await getAdminDiagnostics();

  return sendSuccess(res, {
    data,
    message: "Admin diagnostics loaded successfully.",
  });
}

/**
 * 13. LEXIMI I CILËSIMEVE TË APLIKACIONIT
 * Shfaq konfigurimet e sistemit (p.sh. kufijtë e sigurisë, pragjet e besueshmërisë, etj.).
 */
export async function adminConfiguration(req, res) {
  const data = await getAdminConfiguration();

  return sendSuccess(res, {
    data,
    message: "Application configuration loaded successfully.",
  });
}

/**
 * 14. PËRDITËSIMI I CILËSIMEVE TË APLIKACIONIT
 * Ruan ndryshimet e reja që administratori bën te cilësimet e sistemit.
 */
export async function adminUpdateConfiguration(req, res) {
  const data = await updateAdminConfigurationValues(req.body || {});

  return sendSuccess(res, {
    data,
    message: "Application configuration updated successfully.",
  });
}
