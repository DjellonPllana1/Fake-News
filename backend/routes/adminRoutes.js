/**
 * ============================================================================
 * RRUGËT E ZONËS ADMINISTRATIVE (adminRoutes.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton të gjitha adresat e rezervuara vetëm për administratorët.
 * 
 * Siguria me fjalë të thjeshta:
 * Vini re rreshtin: router.use(requireAuth, requireRole("Admin"));
 * Ky rresht vepron si "truproja te dera". Nëse dikush përpiqet të hyjë
 * në këto adresa pa qenë i kyçur ose pa pasur rolin "Admin",
 * sistemi e refuzon menjëherë me mesazh gabimi.
 */

import { Router } from "express";
import {
  adminAnalyses,
  adminApiLogs,
  adminConfiguration,
  adminDashboard,
  adminDatasets,
  adminDeleteAnalysis,
  adminDeleteDataset,
  adminDiagnostics,
  adminDownloadDatasets,
  adminModels,
  adminRetrainModels,
  adminUpdateConfiguration,
  adminUpdateUser,
  adminUsers,
} from "../controllers/adminController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Siguria: Vetëm përdoruesit me rolin "Admin" lejohen të kalojnë tutje
router.use(requireAuth, requireRole("Admin"));

// Statistikat e përgjithshme të panelit të administratorit
router.get("/admin/dashboard", asyncHandler(adminDashboard));

// Menaxhimi i përdoruesve të regjistruar
router.get("/admin/users", asyncHandler(adminUsers));
router.patch("/admin/users/:email", asyncHandler(adminUpdateUser));

// Menaxhimi i lajmeve në bazën e të dhënave (Dataset)
router.get("/admin/datasets", asyncHandler(adminDatasets));
router.get("/admin/datasets/download.csv", asyncHandler(adminDownloadDatasets));
router.delete("/admin/datasets/:articleId", asyncHandler(adminDeleteDataset));

// Menaxhimi i historikut të analizave
router.get("/admin/analyses", asyncHandler(adminAnalyses));
router.delete("/admin/analyses/:analysisId", asyncHandler(adminDeleteAnalysis));

// Inteligjenca Artificiale: Shikimi dhe ritrajnimi i modeleve
router.get("/admin/models", asyncHandler(adminModels));
router.post("/admin/models/retrain", asyncHandler(adminRetrainModels));

// Kontrolli teknik dhe cilësimet e sistemit
router.get("/admin/api-logs", asyncHandler(adminApiLogs));
router.get("/admin/diagnostics", asyncHandler(adminDiagnostics));
router.get("/admin/configuration", asyncHandler(adminConfiguration));
router.patch("/admin/configuration", asyncHandler(adminUpdateConfiguration));

export default router;
