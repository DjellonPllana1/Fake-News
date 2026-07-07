import { sendSuccess } from "../utils/apiResponse.js";
import { analyzeArticle, fetchArticlePreview, getAnalysisHistory, getDatasetArticles } from "../services/analysisService.js";
import { validateArticlesQuery, validateHistoryQuery } from "../utils/validation.js";

export async function analyze(req, res) {
  const data = await analyzeArticle(req.validated);
  return sendSuccess(res, {
    data,
    message: "Article analyzed successfully.",
  });
}

export async function fetchUrl(req, res) {
  const data = await fetchArticlePreview(req.validated.url);
  return sendSuccess(res, {
    data,
    message: "Article content fetched successfully.",
  });
}

export async function history(req, res) {
  const filters = validateHistoryQuery(req.query);
  const data = await getAnalysisHistory(filters);
  return sendSuccess(res, {
    data,
    message: "Analysis history loaded successfully.",
  });
}

export async function articles(req, res) {
  const filters = validateArticlesQuery(req.query);
  const data = await getDatasetArticles(filters);
  return sendSuccess(res, {
    data,
    message: "Dataset articles loaded successfully.",
  });
}
