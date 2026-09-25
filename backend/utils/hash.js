/**
 * ============================================================================
 * KODUESI I SIGURT I FJALËKALIMEVE (hash.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar shndërron fjalëkalimet e zakonshme në një kod të padeshifrueshëm SHA-256.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Nëse përdoruesi zgjedh fjalëkalimin "sekret123", ky funksion e shndërron në diçka si:
 * "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f".
 * Edhe sikur dikush të vjedhë bazën e të dhënave, ai nuk mund ta kthejë dot këtë kod
 * mbrapsht te fjalëkalimi origjinal.
 */

import crypto from "crypto";

export function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password || "")).digest("hex");
}
