/**
 * ============================================================================
 * TRAJTUESI QENDROR I GABIMEVE (errorHandler.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar është "rrjeta e shpëtimit" e serverit.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur ndodh ndonjë gabim gjatë punës (p.sh. dikush kërkon një faqe që nuk ekziston,
 * shkruan të dhëna të gabuara, ose prishet lidhja me internetin):
 * Në vend që serveri të fiket ose të shfaqë mesazhe të frikshme me kode teknike,
 * ky skedar e kap gabimin, e kupton çfarë ndodhi, dhe ia shpjegon përdoruesit
 * me një përgjigje të qartë dhe të kulturuar në format JSON.
 */

import { AppError, isAppError } from "../utils/appError.js";

/**
 * 1. KUR NJË FAQE NUK GJENDET (404 Not Found)
 * Nëse përdoruesi kërkon një adresë që nuk ekziston në server.
 */
export function notFoundHandler(req, _res, next) {
  next(new AppError(`Adresa ${req.method} ${req.originalUrl} nuk u gjet në server.`, 404, "ROUTE_NOT_FOUND"));
}

/**
 * 2. KAPËSI I PËRGJITHSHËM I GABIMEVE
 * Çdo gabim që ndodh kudo në aplikacion përfundon këtu.
 */
export function errorHandler(error, _req, res, next) {
  void next;

  // Nëse është gabim i parashikuar nga ne (AppError), e përdorim siç është.
  // Përndryshe e kthejmë në një gabim të përgjithshëm serveri.
  const appError = isAppError(error)
    ? error
    : new AppError(
        error.type === "entity.parse.failed" ? "Të dhënat e dërguara përmbajnë format të pavlefshëm JSON." : error.message || "Ndodhi një gabim i papritur në server.",
        error.statusCode || error.status || (error.type === "entity.parse.failed" ? 400 : 500),
        error.code || (error.type === "entity.parse.failed" ? "INVALID_JSON" : "INTERNAL_SERVER_ERROR"),
        error.details || null
      );

  // Nëse gabimi është i rëndë (gabim i brendshëm 500), e printojmë në terminal për programuesin
  if (appError.statusCode >= 500) {
    console.error(error);
  }

  // Ia kthejmë përgjigjen e pastër shfletuesit me kodin e gabimit dhe mesazhin shpjegues
  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details || undefined,
    },
  });
}
