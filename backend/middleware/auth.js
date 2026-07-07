import { AppError } from "../utils/appError.js";
import { verifyAuthToken } from "../services/authService.js";

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

export async function requireAuth(req, _res, next) {
  try {
    const token = readToken(req);
    req.user = await verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  const allowedRoles = new Set(roles.map((role) => String(role || "").trim()).filter(Boolean));

  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Authentication is required for this action.", 401, "AUTH_REQUIRED"));
      return;
    }

    if (!allowedRoles.has(req.user.role)) {
      next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}
