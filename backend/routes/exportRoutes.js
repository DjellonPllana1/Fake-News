import { Router } from "express";
import { downloadAnalysisPdf, downloadHistoryCsv, downloadHistoryPdf } from "../controllers/exportController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/history/export.csv", asyncHandler(downloadHistoryCsv));
router.get("/history/export.pdf", asyncHandler(downloadHistoryPdf));
router.get("/history/:analysisId/export.pdf", asyncHandler(downloadAnalysisPdf));

export default router;
