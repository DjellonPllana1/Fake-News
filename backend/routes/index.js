/**
 * ============================================================================
 * SHPËRNDARËSI QENDROR I RRUGËVE (routes/index.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar bashkon të gjitha "rrugët" (URL endpoints) të aplikacionit.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Mendojeni si tabelën kryesore të drejtimit në një stacion treni ose aeroport.
 * Çdo kërkesë që vjen në server me "/api/..." kalon këtu, dhe ky skedar
 * e drejton te nën-ndarja përkatëse (autentikim, analiza, administrator, etj.).
 */

import { Router } from "express";
import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import analysisRoutes from "./analysisRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import exportRoutes from "./exportRoutes.js";
import modelRoutes from "./modelRoutes.js";
import systemRoutes from "./systemRoutes.js";

const router = Router();

// Bashkojmë të gjitha rrugët në një vend të vetëm
router.use(authRoutes);       // Rrugët e hyrjes/daljes (login)
router.use(analysisRoutes);   // Rrugët e analizës së lajmeve
router.use(dashboardRoutes);  // Rrugët e statistikave të faqes
router.use(exportRoutes);     // Rrugët e shkarkimit të skedarëve (PDF/CSV)
router.use(modelRoutes);      // Rrugët e modelit të Inteligjencës Artificiale
router.use(systemRoutes);     // Rrugët e gjendjes së serverit
router.use(adminRoutes);      // Rrugët e rezervuara vetëm për administratorët

export default router;
