/**
 * ============================================================================
 * ROJA E SIGURISË DHE KONTROLLI I QASJES (auth.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar është si "truproja te dera" për serverin.
 * Ai siguron që vetëm njerëzit e autorizuar të kenë akses në funksione të caktuara.
 * 
 * Si funksionon me fjalë të thjeshta:
 * 1. Kur përdoruesi hyn në sistem, ai merr një "çelës digjital" (Token).
 * 2. Sa herë që bën një veprim, ai e paraqet këtë çelës.
 * 3. Funksioni `requireAuth` kontrollon: "A është i vërtetë ky çelës?"
 * 4. Funksioni `requireRole` kontrollon: "A ka ky person të drejtë të hyjë këtu (p.sh. a është Admin)?"
 */

import { AppError } from "../utils/appError.js";
import { verifyAuthToken } from "../services/authService.js";

/**
 * Funksion ndihmës: Gjen çelësin digjital (Token) brenda kërkesës së ardhur.
 * Çelësi zakonisht vjen i fshehur te koka e kërkesës (Headers: Bearer <token>)
 * ose nganjëherë në fund të linkut (?token=...).
 */
function readToken(req) {
  const authorization = req.headers.authorization || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  if (typeof req.query.token === "string" && req.query.token.trim()) {
    return req.query.token.trim();
  }

  return "";
}

/**
 * KONTROLLI I HYRJES (requireAuth)
 * Ndalon çdo vizitor anonim që nuk është i identifikuar.
 * Nëse vizitori ka një çelës të rregullt, të dhënat e tij ruhen te `req.user`
 * dhe kërkesa lejohet të vazhdojë tutje (next()).
 */
export async function requireAuth(req, _res, next) {
  try {
    const token = readToken(req);
    // Verifikon nëse çelësi është i vlefshëm dhe nxjerr profilin e përdoruesit
    req.user = await verifyAuthToken(token);
    next(); // Çdo gjë në rregull, kalo tutje
  } catch (error) {
    // Çelësi mungon ose është i pavlefshëm
    next(error);
  }
}

/**
 * KONTROLLI I ROLIT (requireRole)
 * Përdoret për zona të kufizuara, p.sh. vetëm për Administratorë.
 * Shembull: requireRole("Admin") lejon vetëm ata persona që kanë rolin "Admin".
 */
export function requireRole(...roles) {
  const allowedRoles = new Set(roles.map((role) => String(role || "").trim()).filter(Boolean));

  return (req, _res, next) => {
    // Nëse personi nuk njihet fare, e ndalojmë me gabim 401
    if (!req.user) {
      next(new AppError("Duhet të jeni të kyçur për të kryer këtë veprim.", 401, "AUTH_REQUIRED"));
      return;
    }

    // Nëse personi nuk ka rolin e duhur, e ndalojmë me gabim 403 (Ndaluar)
    if (!allowedRoles.has(req.user.role)) {
      next(new AppError("Nuk keni leje për të kryer këtë veprim.", 403, "FORBIDDEN"));
      return;
    }

    // Nëse personi ka rolin e duhur, lejohet të vazhdojë
    next();
  };
}
