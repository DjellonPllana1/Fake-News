import { Router } from "express";
import { systemDiagnostics } from "../controllers/systemController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/system-diagnostics", asyncHandler(systemDiagnostics));

export default router;
