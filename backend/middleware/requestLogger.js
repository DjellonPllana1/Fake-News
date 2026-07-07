import { recordApiLog } from "../services/apiLogService.js";

export function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    if (!req.originalUrl.startsWith("/api")) {
      return;
    }

    recordApiLog({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userEmail: req.user?.email || "Anonymous",
      userRole: req.user?.role || "Anonymous",
      ip: req.ip || req.socket?.remoteAddress || "",
    });
  });

  next();
}
