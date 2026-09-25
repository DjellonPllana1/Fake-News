/**
 * ============================================================================
 * KONTROLLUESI I VLEFSHMËRISË SË TË DHËNAVE (validate.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar parandalon futjen e të dhënave të pasakta, bosh, apo të rrezikshme.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Para se të nisë analiza e një lajmi ose procesi i logimit, ky kontrollues shikon:
 * - A e shkroi përdoruesi tekstin e artikullit?
 * - A është linku i vërtetë me http/https?
 * - A është emaili në formatin e duhur?
 * Nëse të dhënat nuk plotësojnë rregullat, ndalon kërkesën dhe i tregon përdoruesit
 * gabimin (p.sh. "Fusha e tekstit nuk mund të jetë bosh").
 */

import { AppError } from "../utils/appError.js";

export function validateRequest(validator) {
  return (req, _res, next) => {
    // Ekzekuton funksionin e kontrollit mbi të dhënat e dërguara (req.body)
    const result = validator(req.body);

    // Nëse të dhënat nuk janë të vlefshme, ndalon kërkesën me gabim 400 (Bad Request)
    if (!result.valid) {
      next(new AppError("Të dhënat e dërguara nuk janë të vlefshme.", 400, "VALIDATION_ERROR", result.errors));
      return;
    }

    // Nëse janë të sakta, i pastron dhe i ruan te req.validated për përdorim të mëtejshëm
    req.validated = result.value;
    next();
  };
}
