/**
 * ============================================================================
 * KONTROLLORI I SISTEMIT DHE DIAGNOSTIKIMIT (systemController.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar shërben për të parë gjendjen teknike të krejt serverit dhe pajisjes.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Ashtu si një mjek që i mat pulsin dhe tensionin njeriut,
 * ky kontrollor mat "shëndetin" e serverit:
 * - A ka mjaftueshëm memorie (RAM) të lirë?
 * - Sa kohë ka serveri që rri ndezur pa u fikur (Uptime)?
 * - A po lidhet serveri me bazën e të dhënave (Databazën)?
 */

import { getSystemDiagnostics } from "../services/diagnosticsService.js";
import { sendSuccess } from "../utils/apiResponse.js";

/**
 * DIAGNOSTIKIMI I SISTEMIT (System Diagnostics)
 * Mbledh të dhënat teknike mbi serverin dhe ia dërgon faqes për kontroll.
 */
export async function systemDiagnostics(req, res) {
  const data = await getSystemDiagnostics();

  return sendSuccess(res, {
    data,
    message: "System diagnostics loaded successfully.",
  });
}
