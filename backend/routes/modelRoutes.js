/**
 * ============================================================================
 * RRUGËT E MODELIT TË INTELIGJENCËS ARTIFICIALE (modelRoutes.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton adresat për të komunikuar me modelin e Machine Learning (AI).
 */

import { Router } from "express";
import { health, modelMetrics, modelReport, retrain } from "../controllers/modelController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Adresa publike: Kontrollon nëse shërbimi i modelit është i ndezur
router.get("/health", asyncHandler(health));

// Kthen të dhënat mbi saktësinë e modelit (kërkon kyçje)
router.get("/model-metrics", requireAuth, asyncHandler(modelMetrics));

// Kthen raportin e detajuar të modelit
router.get("/model/report", requireAuth, asyncHandler(modelReport));

// Nis ritrajnimin e modelit (vetëm administratorët kanë leje ta bëjnë këtë!)
router.post("/model/retrain", requireAuth, requireRole("Admin"), asyncHandler(retrain));

export default router;
