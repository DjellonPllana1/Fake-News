import { Router } from "express";
import { health, modelMetrics, modelReport, retrain } from "../controllers/modelController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/health", asyncHandler(health));
router.get("/model-metrics", requireAuth, asyncHandler(modelMetrics));
router.get("/model/report", requireAuth, asyncHandler(modelReport));
router.post("/model/retrain", requireAuth, requireRole("Admin"), asyncHandler(retrain));

export default router;
