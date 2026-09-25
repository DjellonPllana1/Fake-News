/**
 * ============================================================================
 * KONTROLLORI I HYRJES DHE AUTENTIKIMIT (authController.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar merret me sigurinë dhe identifikimin e përdoruesve në aplikacion.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur përdoruesi shkruan emailin dhe fjalëkalimin për t'u kyçur (Login),
 * ky funksion kontrollon nëse të dhënat janë të sakta. Nëse po, i jep përdoruesit
 * një "lejekalimi" (token digjital) që i lejon qasje në sistem.
 */

import { sendSuccess } from "../utils/apiResponse.js";
import { loginUser } from "../services/authService.js";

/**
 * KYÇJA E PËRDORUESIT (Login)
 * Merr emailin dhe fjalëkalimin nga përdoruesi, verifikon identitetin e tij,
 * dhe nëse çdo gjë është në rregull, kthen suksesin dhe të dhënat e profilit.
 */
export async function login(req, res) {
  // Thërret shërbimin e logimit me të dhënat e vlefshme që dërgoi përdoruesi
  const data = await loginUser(req.validated);

  // Kthen përgjigjen me mesazh pozitiv
  return sendSuccess(res, {
    data,
    message: "Login successful.",
  });
}
