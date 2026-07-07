import { AppError } from "../utils/appError.js";

export function validateRequest(validator) {
  return (req, _res, next) => {
    const result = validator(req.body);

    if (!result.valid) {
      next(new AppError("Request validation failed.", 400, "VALIDATION_ERROR", result.errors));
      return;
    }

    req.validated = result.value;
    next();
  };
}
