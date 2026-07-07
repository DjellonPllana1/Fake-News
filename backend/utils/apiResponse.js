export function sendSuccess(res, { data = {}, message = "Request completed successfully.", meta, statusCode = 200 }) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}
