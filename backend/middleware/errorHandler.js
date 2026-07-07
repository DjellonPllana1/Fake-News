import { AppError, isAppError } from "../utils/appError.js";

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found.`, 404, "ROUTE_NOT_FOUND"));
}

export function errorHandler(error, _req, res, next) {
  void next;
  const appError = isAppError(error)
    ? error
    : new AppError(
        error.type === "entity.parse.failed" ? "Request body contains invalid JSON." : error.message || "Unexpected server error.",
        error.statusCode || error.status || (error.type === "entity.parse.failed" ? 400 : 500),
        error.code || (error.type === "entity.parse.failed" ? "INVALID_JSON" : "INTERNAL_SERVER_ERROR"),
        error.details || null
      );

  if (appError.statusCode >= 500) {
    console.error(error);
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details || undefined,
    },
  });
}
