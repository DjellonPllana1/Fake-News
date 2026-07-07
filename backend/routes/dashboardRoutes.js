import { Router } from "express";
import { dashboard } from "../controllers/dashboardController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/dashboard", asyncHandler(dashboard));

export default router;
