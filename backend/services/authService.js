import { Buffer } from "node:buffer";
import { findUserByEmail } from "../database.js";
import { AppError } from "../utils/appError.js";
import { hashPassword } from "../utils/hash.js";

const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
const SESSION_TTL_MS = Number.isFinite(SESSION_TTL_HOURS) && SESSION_TTL_HOURS > 0 ? SESSION_TTL_HOURS * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;

export function sanitizeUser(user) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function createAuthToken(user) {
  return Buffer.from(
    JSON.stringify({
      email: user.email,
      role: user.role,
      issuedAt: Date.now(),
    })
  ).toString("base64");
}

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

export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);

  if (!user || user.status !== "Active" || user.passwordHash !== hashPassword(password)) {
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  return {
    user: sanitizeUser(user),
    token: createAuthToken(user),
  };
}

export async function verifyAuthToken(token) {
  const parsed = parseAuthToken(token);

  if (!parsed?.email) {
    throw new AppError("A valid authentication token is required.", 401, "AUTH_TOKEN_REQUIRED");
  }

  if (parsed.issuedAt && Date.now() - parsed.issuedAt > SESSION_TTL_MS) {
    throw new AppError("Your session has expired. Please sign in again.", 401, "AUTH_TOKEN_EXPIRED");
  }

  const user = await findUserByEmail(parsed.email);

  if (!user || user.status !== "Active") {
    throw new AppError("The authenticated user is no longer available.", 401, "AUTH_USER_INVALID");
  }

  return sanitizeUser(user);
}
