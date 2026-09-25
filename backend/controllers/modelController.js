/**
 * ============================================================================
 * KONTROLLORI I MODELIT TË INTELIGJENCËS ARTIFICIALE (modelController.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar komunikon me modelin e Machine Learning (Inteligjencës Artificiale)
 * të shkruar në Python, i cili zbulon a është një lajm i rremë apo jo.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Aplikacioni përdor një model matematikor të trajnuar me mijëra lajme të kaluara.
 * Ky skedar shërben për:
 * 1. Të parë sa i saktë është modeli (p.sh. 94% saktësi).
 * 2. Të parë raportin e performancës së tij.
 * 3. Të nisur ritrajnimin e modelit kur duam ta përmirësojmë.
 * 4. Të kontrolluar nëse shërbimi i Python-it është i ndezur dhe gati (Health check).
 */

import { sendSuccess } from "../utils/apiResponse.js";
import { getModelMetrics, getHealthStatus, retrainModels } from "../services/modelService.js";

/**
 * 1. METRIKAT DHE SAKTËSIA E MODELIT
 * Kthen statistikat e saktësisë së AI-së (Precision, Recall, F1-Score).
 */
export async function modelMetrics(req, res) {
  const data = await getModelMetrics();

  return sendSuccess(res, {
    data,
    message: "Model metrics loaded successfully.",
  });
}

/**
 * 2. RAPORTI I DETAJUAR I MODELIT
 * Kthen një përmbledhje të hollësishme mbi mënyrën se si modeli merr vendime.
 */
export async function modelReport(req, res) {
  const data = await getModelMetrics();

  return sendSuccess(res, {
    data,
    message: "Model report loaded successfully.",
  });
}

/**
 * 3. TRAJNIMI I MODELIT NGA E PARA (Retrain)
 * Nis procesin ku kompjuteri rishikon të gjitha lajmet në databazë
 * dhe e trajnon sërish modelin për të qenë sa më i saktë.
 */
export async function retrain(req, res) {
  const data = await retrainModels();

  return sendSuccess(res, {
    data,
    message: "Models trained successfully.",
  });
}

/**
 * 4. KONTROLLI I SHËNDETIT TË MODELIT (Health Check)
 * Kontrollon nëse moduli i Inteligjencës Artificiale është zgjuar dhe po përgjigjet normalisht.
 */
export async function health(req, res) {
  const data = await getHealthStatus();

  return sendSuccess(res, {
    data,
    message: "Service health check passed.",
  });
}
