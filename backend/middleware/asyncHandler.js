/**
 * ============================================================================
 * MENAXHUESI I VEPRIMEVE ASINKRONE (asyncHandler.js)
 * ============================================================================
 * Qëllimi:
 * Një ndihmës i vogël por thelbësor për të parandaluar rrëzimin e serverit.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Kur një funksion kërkon kohë për t'u kryer (p.sh. leximi i të dhënave nga databaza
 * ose thirrja e modelit AI) quhet veprim "asinkron" (async).
 * Nëse gjatë kësaj kohe ndodh ndonjë e papritur apo gabim, ky funksion kujdeset
 * që ta kapë menjëherë atë gabim dhe ta dërgojë te menaxhuesi i gabimeve (next),
 * në vend që serveri të bllokohet apo të fiket.
 */

export function asyncHandler(handler) {
  return (req, res, next) => {
    // Ekzekuton funksionin dhe nëse ndodh ndonjë gabim, e kap automatikisht me .catch(next)
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
