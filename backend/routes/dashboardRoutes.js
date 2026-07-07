import { Router } from "express";
import { dashboard } from "../controllers/dashboardController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, asyncHandler(dashboard));

export default router;
