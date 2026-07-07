import { Router } from "express";
import { systemDiagnostics } from "../controllers/systemController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/system-diagnostics", requireAuth, asyncHandler(systemDiagnostics));

export default router;
