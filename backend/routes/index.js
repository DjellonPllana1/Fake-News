import { Router } from "express";
import authRoutes from "./authRoutes.js";
import analysisRoutes from "./analysisRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import exportRoutes from "./exportRoutes.js";
import modelRoutes from "./modelRoutes.js";
import systemRoutes from "./systemRoutes.js";

const router = Router();

router.use(authRoutes);
router.use(analysisRoutes);
router.use(dashboardRoutes);
router.use(exportRoutes);
router.use(modelRoutes);
router.use(systemRoutes);

export default router;
