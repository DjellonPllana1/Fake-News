/**
 * ============================================================================
 * RRUGËT E HYRJES DHE IDENTIFIKIMIT (authRoutes.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton adresën e hyrjes në sistem (Login).
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur përdoruesi plotëson formën e hyrjes në ueb dhe klikon butonin,
 * kërkesa vjen te adresa "/api/login". Këtu kontrollohet nëse emaili
 * dhe fjalëkalimi janë plotësuar sipas rregullave, dhe pastaj thirret funksioni login.
 */

import { Router } from "express";
import { login } from "../controllers/authController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { validateLoginPayload } from "../utils/validation.js";

const router = Router();

// Adresa: POST /api/login -> Verifikon të dhënat dhe kyç përdoruesin
router.post("/login", validateRequest(validateLoginPayload), asyncHandler(login));

export default router;
