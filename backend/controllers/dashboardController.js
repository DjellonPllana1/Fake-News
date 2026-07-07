import { sendSuccess } from "../utils/apiResponse.js";
import { getDashboardData } from "../services/dashboardService.js";

export async function dashboard(req, res) {
  const data = await getDashboardData();
  return sendSuccess(res, {
    data,
    message: "Dashboard loaded successfully.",
  });
}
