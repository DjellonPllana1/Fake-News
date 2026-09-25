/**
 * ============================================================================
 * RRUGËT E ANALIZËS SË LAJMEVE (analysisRoutes.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton adresat (URL-të) ku përdoruesi mund të kërkojë verifikimin e një lajmi.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Çdo rresht më poshtë thotë:
 * "Nëse vjen kërkesë te kjo adresë, së pari kontrollo nëse përdoruesi është i kyçur (requireAuth),
 * pastaj kontrollo nëse të dhënat janë të vlefshme (validateRequest),
 * dhe në fund ekzekuto funksionin përkatës (analyze, fetchUrl, etj.)."
 */

import { Router } from "express";
import { analyze, articles, fetchUrl, history } from "../controllers/analysisController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { validateAnalyzePayload, validateFetchUrlPayload } from "../utils/validation.js";

const router = Router();

// Adresa: POST /api/analyze -> Analizon një artikull të shkruar
router.post("/analyze", requireAuth, validateRequest(validateAnalyzePayload), asyncHandler(analyze));

// Adresa: POST /api/fetch-url -> Merr artikullin automatikisht nga një link interneti
router.post("/fetch-url", requireAuth, validateRequest(validateFetchUrlPayload), asyncHandler(fetchUrl));

// Adresa: GET /api/history -> Merr historikun e të gjitha analizave të kaluara
router.get("/history", requireAuth, asyncHandler(history));

// Adresa: GET /api/articles -> Merr listën e artikujve ekzistues nga baza e të dhënave
router.get("/articles", requireAuth, asyncHandler(articles));

export default router;
