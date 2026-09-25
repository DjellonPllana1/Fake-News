/**
 * ============================================================================
 * KLASA E PERSONALIZUAR E GABIMEVE (appError.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar krijon një mënyrë të thjeshtë dhe të pastër për të krijuar gabime me kuptim.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Në vend që serveri të nxjerrë një gabim teknik të paqartë,
 * ne përdorim `new AppError("Mesazhi për përdoruesin", kodiHttp, "KODI_I_GABIMIT")`.
 * Për shembull: new AppError("Emaili nuk është i saktë", 400, "INVALID_EMAIL").
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode; // Kodi zyrtar HTTP (p.sh. 400, 401, 404, 500)
    this.code = code;             // Emri unik i gabimit me shkronja të mëdha
    this.details = details;       // Hollësi shtesë nëse ka
  }
}

/**
 * Kontrollon nëse një gabim është i krijuar nga klasa jonë AppError.
 */
export function isAppError(error) {
  return error instanceof AppError;
}
