import { Router } from "express";
import { health, modelMetrics, modelReport, retrain } from "../controllers/modelController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/health", asyncHandler(health));
router.get("/model-metrics", asyncHandler(modelMetrics));
router.get("/model/report", asyncHandler(modelReport));
router.post("/model/retrain", asyncHandler(retrain));

export default router;
