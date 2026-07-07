import { sendSuccess } from "../utils/apiResponse.js";
import { loginUser } from "../services/authService.js";

export async function login(req, res) {
  const data = await loginUser(req.validated);
  return sendSuccess(res, {
    data,
    message: "Login successful.",
  });
}
