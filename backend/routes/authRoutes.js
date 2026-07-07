import { Router } from "express";
import { login } from "../controllers/authController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { validateLoginPayload } from "../utils/validation.js";

const router = Router();

router.post("/login", validateRequest(validateLoginPayload), asyncHandler(login));

export default router;
