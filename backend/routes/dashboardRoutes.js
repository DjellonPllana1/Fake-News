/**
 * ============================================================================
 * RRUGËT E PANELIT KRYESOR (dashboardRoutes.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton rrugën për marrjen e të dhënave të faqes kryesore.
 * Përdoruesi duhet të jetë i kyçur (requireAuth) për t'i parë këto statistika.
 */

import { Router } from "express";
import { dashboard } from "../controllers/dashboardController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Adresa: GET /api/dashboard -> Kthen të dhënat dhe shifrat për faqen kryesore
router.get("/dashboard", requireAuth, asyncHandler(dashboard));

export default router;
