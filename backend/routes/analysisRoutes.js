import { Router } from "express";
import { analyze, articles, fetchUrl, history } from "../controllers/analysisController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { validateAnalyzePayload, validateFetchUrlPayload } from "../utils/validation.js";

const router = Router();

router.post("/analyze", requireAuth, validateRequest(validateAnalyzePayload), asyncHandler(analyze));
router.post("/fetch-url", requireAuth, validateRequest(validateFetchUrlPayload), asyncHandler(fetchUrl));
router.get("/history", requireAuth, asyncHandler(history));
router.get("/articles", requireAuth, asyncHandler(articles));

export default router;
