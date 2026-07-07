import { getSystemDiagnostics } from "../services/diagnosticsService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function systemDiagnostics(req, res) {
  const data = await getSystemDiagnostics();
  return sendSuccess(res, {
    data,
    message: "System diagnostics loaded successfully.",
  });
}
