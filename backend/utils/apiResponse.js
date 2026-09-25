/**
 * ============================================================================
 * FORMATUESI I PËRGJIGJEVE TË SUKSESSHME (apiResponse.js)
 * ============================================================================
 * Qëllimi:
 * Ky funksion siguron që çdo përgjigje e suksesshme që i dërgohet faqes së internetit
 * të ketë gjithmonë të njëjtën strukturë të rregullt:
 * - success: true (tregon se veprimi u krye me sukses)
 * - message: mesazh njerëzor (p.sh. "Analiza përfundoi me sukses")
 * - data: të dhënat reale (artikulli, statistikat, përdoruesi)
 */

export function sendSuccess(res, { data = {}, message = "Request completed successfully.", meta, statusCode = 200 }) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}
