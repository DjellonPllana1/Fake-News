/**
 * ============================================================================
 * REGJISTRUESI I KËRKESAVE (requestLogger.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar shërben si "ditari" i serverit.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Sa herë që dikush hap një faqe, klikon një buton, ose bën një kërkesë:
 * Ky skedar mat sa milisekonda u deshën për t'u përgjigjur,
 * çfarë statusi pati (sukses apo dështim), cili përdorues e bëri,
 * dhe e ruan këtë veprim në librin e shënimeve (Logs) që admini ta shohë më vonë.
 */

import { recordApiLog } from "../services/apiLogService.js";

export function requestLogger(req, res, next) {
  // Shënojmë kohën ekzakte kur nisi kërkesa
  const startedAt = Date.now();

  // Kur serveri përfundon së dërguari përgjigjen, ruajmë të dhënat në ditar
  res.on("finish", () => {
    // Regjistrojmë vetëm kërkesat që fillojnë me /api
    if (!req.originalUrl.startsWith("/api")) {
      return;
    }

    recordApiLog({
      method: req.method,                       // Lloji i kërkesës (GET, POST, DELETE, etj.)
      path: req.originalUrl,                    // Adresa e thirrur (p.sh. /api/analyze)
      statusCode: res.statusCode,               // Kodi i rezultatit (200 OK, 404 Not Found, etj.)
      durationMs: Date.now() - startedAt,       // Sa kohë iu desh (në milisekonda)
      userEmail: req.user?.email || "Anonymous",// Emaili i personit (ose Anonim nëse s'është kyçur)
      userRole: req.user?.role || "Anonymous",  // Roli (Admin, User ose Anonim)
      ip: req.ip || req.socket?.remoteAddress || "", // Adresa IP e përdoruesit
    });
  });

  // Lejojmë kërkesën të vazhdojë tutje te kontrollori
  next();
}
