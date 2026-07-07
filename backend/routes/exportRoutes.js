import { Router } from "express";
import { downloadAnalysisPdf, downloadHistoryCsv, downloadHistoryPdf } from "../controllers/exportController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/history/export.csv", requireAuth, asyncHandler(downloadHistoryCsv));
router.get("/history/export.pdf", requireAuth, asyncHandler(downloadHistoryPdf));
router.get("/history/:analysisId/export.pdf", requireAuth, asyncHandler(downloadAnalysisPdf));

export default router;
