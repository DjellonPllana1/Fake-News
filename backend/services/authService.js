/**
 * ============================================================================
 * SHËRBIMI I AUTENTIKIMIT DHE SIGURISË (authService.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar merret me hyrjen (login) e sigurt të përdoruesve,
 * kontrollin e fjalëkalimeve dhe krijimin e biletave digjitale (Tokens).
 * 
 * Si funksionon me fjalë të thjeshta:
 * 1. Fjalëkalimet nuk ruhen kurrë si tekst i thjeshtë në databazë (p.sh. "sekret123"),
 *    por transformohen në një kod të padeshifrueshëm (Hash) për arsye sigurie.
 * 2. Kur përdoruesi hyn, krahasohet kodi i shkruar me kodin e ruajtur.
 * 3. Nëse përputhen, përdoruesit i lëshohet një "biletë digjitale" (Token) me afat 12 orë.
 * 4. Për 12 orë, përdoruesi mund të lundrojë në faqe pa pasur nevojë të shkruajë fjalëkalimin sërish.
 */

import { Buffer } from "node:buffer";
import { findUserByEmail } from "../database.js";
import { AppError } from "../utils/appError.js";
import { hashPassword } from "../utils/hash.js";

// Kohëzgjatja e sesionit: parazgjedhur 12 orë (në milisekonda)
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
const SESSION_TTL_MS = Number.isFinite(SESSION_TTL_HOURS) && SESSION_TTL_HOURS > 0 ? SESSION_TTL_HOURS * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;

/**
 * PASTRUESI I TË DHËNAVE TË PËRDORUESIT (Sanitize)
 * Heq fjalëkalimin nga të dhënat e përdoruesit para se t'ia dërgojë ekranit,
 * në mënyrë që askush të mos e shohë fjalëkalimin e fshehtë.
 */
export function sanitizeUser(user) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

/**
 * Krijon çelësin digjital (Token) të koduar në format Base64.
 * Përmban emailin, rolin (Admin/User) dhe kohën kur u krijua.
 */
function createAuthToken(user) {
  return Buffer.from(
    JSON.stringify({
      email: user.email,
      role: user.role,
      issuedAt: Date.now(),
    })
  ).toString("base64");
}

/**
 * Lexon dhe zbërthen çelësin digjital (Token) nga formati Base64 në të dhëna normale.
 */
function parseAuthToken(token) {
  if (!token) {
    return null;
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");

    if (!decoded) {
      return null;
    }

    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      return {
        email: String(parsed.email || "").trim().toLowerCase(),
        role: String(parsed.role || "").trim(),
        issuedAt: Number(parsed.issuedAt || 0) || 0,
      };
    }

    const [email, rawIssuedAt] = decoded.split(":");
    return {
      email: String(email || "").trim().toLowerCase(),
      role: "",
      issuedAt: Number(rawIssuedAt || 0) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * PROCESI I HYRJES (Login)
 * 1. Kërkon përdoruesin në databazë sipas emailit.
 * 2. Kontrollon a është llogaria aktive (jo e bllokuar).
 * 3. Krahason fjalëkalimin e shkruar me fjalëkalimin e koduar në databazë.
 * 4. Kthen të dhënat e pastruara dhe çelësin digjital (Token).
 */
export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);

  if (!user || user.status !== "Active" || user.passwordHash !== hashPassword(password)) {
    throw new AppError("Emaili ose fjalëkalimi është i pasaktë.", 401, "INVALID_CREDENTIALS");
  }

  return {
    user: sanitizeUser(user),
    token: createAuthToken(user),
  };
}

/**
 * VERIFIKIMI I ÇELËSIT DIGJITAL (Verify Token)
 * Kur përdoruesi bën një veprim, ky funksion kontrollon:
 * - A është çelësi i vërtetë?
 * - A ka skaduar afati i tij (më shumë se 12 orë)?
 * - A vazhdon të ekzistojë ky përdorues në sistem?
 */
export async function verifyAuthToken(token) {
  const parsed = parseAuthToken(token);

  if (!parsed?.email) {
    throw new AppError("Kërkohet një çelës i vlefshëm identifikimi (Token).", 401, "AUTH_TOKEN_REQUIRED");
  }

  // Kontrollon a ka kaluar koha e lejuar (12 orë)
  if (parsed.issuedAt && Date.now() - parsed.issuedAt > SESSION_TTL_MS) {
    throw new AppError("Koha e sesionit tuaj ka skaduar. Ju lutem kyçuni sërish.", 401, "AUTH_TOKEN_EXPIRED");
  }

  const user = await findUserByEmail(parsed.email);

  if (!user || user.status !== "Active") {
    throw new AppError("Përdoruesi nuk është më aktiv në sistem.", 401, "AUTH_USER_INVALID");
  }

  return sanitizeUser(user);
}
