import { Router } from "express";
import { analyze, articles, fetchUrl, history } from "../controllers/analysisController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { validateAnalyzePayload, validateFetchUrlPayload } from "../utils/validation.js";

const router = Router();

router.post("/analyze", validateRequest(validateAnalyzePayload), asyncHandler(analyze));
router.post("/fetch-url", validateRequest(validateFetchUrlPayload), asyncHandler(fetchUrl));
router.get("/history", asyncHandler(history));
router.get("/articles", asyncHandler(articles));

export default router;
