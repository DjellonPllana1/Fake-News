import { Buffer } from "node:buffer";
import { findUserByEmail } from "../database.js";
import { AppError } from "../utils/appError.js";
import { hashPassword } from "../utils/hash.js";

function sanitizeUser(user) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);

  if (!user || user.status !== "Active" || user.passwordHash !== hashPassword(password)) {
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  return {
    user: sanitizeUser(user),
    token: Buffer.from(`${user.email}:${Date.now()}`).toString("base64"),
  };
}
