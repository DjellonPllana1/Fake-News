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

router.use(requireAuth, requireRole("Admin"));

router.get("/admin/dashboard", asyncHandler(adminDashboard));
router.get("/admin/users", asyncHandler(adminUsers));
router.patch("/admin/users/:email", asyncHandler(adminUpdateUser));
router.get("/admin/datasets", asyncHandler(adminDatasets));
router.get("/admin/datasets/download.csv", asyncHandler(adminDownloadDatasets));
router.delete("/admin/datasets/:articleId", asyncHandler(adminDeleteDataset));
router.get("/admin/analyses", asyncHandler(adminAnalyses));
router.delete("/admin/analyses/:analysisId", asyncHandler(adminDeleteAnalysis));
router.get("/admin/models", asyncHandler(adminModels));
router.post("/admin/models/retrain", asyncHandler(adminRetrainModels));
router.get("/admin/api-logs", asyncHandler(adminApiLogs));
router.get("/admin/diagnostics", asyncHandler(adminDiagnostics));
router.get("/admin/configuration", asyncHandler(adminConfiguration));
router.patch("/admin/configuration", asyncHandler(adminUpdateConfiguration));

export default router;
