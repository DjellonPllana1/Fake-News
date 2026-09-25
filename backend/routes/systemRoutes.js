/**
 * ============================================================================
 * RRUGËT E SISTEMIT DHE DIAGNOSTIKIMIT (systemRoutes.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton rrugën për marrjen e të dhënave mbi shëndetin e serverit.
 */

import { Router } from "express";
import { systemDiagnostics } from "../controllers/systemController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Adresa: GET /api/system-diagnostics -> Kthen të dhëna mbi memorien, CPU-në dhe serverin
router.get("/system-diagnostics", requireAuth, asyncHandler(systemDiagnostics));

export default router;
