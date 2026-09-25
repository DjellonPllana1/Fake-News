/**
 * ============================================================================
 * KONTROLLORI I PANELIT TË TË DHËNAVE (dashboardController.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përgatit të dhënat dhe statistikat për faqen kryesore (Dashboard).
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur hapet faqja kryesore e aplikacionit, ky funksion mbledh shifrat kryesore:
 * - Sa artikuj janë analizuar në total?
 * - Sa për qind e lajmeve kanë dalë të rreme (Fake)?
 * - Sa kanë dalë të vërteta (Real)?
 * - Cilat janë burimet më të besueshme dhe më të dyshimta?
 * Dhe të gjitha këto ia dërgon faqes për t'u vizualizuar me grafikë e tabela.
 */

import { sendSuccess } from "../utils/apiResponse.js";
import { getDashboardData } from "../services/dashboardService.js";

/**
 * MERR STATISTIKAT E PANELIT (Dashboard Data)
 * Mbledh të gjitha shifrat e rëndësishme nga databaza dhe ia dërgon faqes.
 */
export async function dashboard(req, res) {
  const data = await getDashboardData();

  return sendSuccess(res, {
    data,
    message: "Dashboard loaded successfully.",
  });
}
