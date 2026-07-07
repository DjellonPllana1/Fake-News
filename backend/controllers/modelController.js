import { sendSuccess } from "../utils/apiResponse.js";
import { getModelMetrics, getHealthStatus, retrainModels } from "../services/modelService.js";

export async function modelMetrics(req, res) {
  const data = await getModelMetrics();
  return sendSuccess(res, {
    data,
    message: "Model metrics loaded successfully.",
  });
}

export async function modelReport(req, res) {
  const data = await getModelMetrics();
  return sendSuccess(res, {
    data,
    message: "Model report loaded successfully.",
  });
}

export async function retrain(req, res) {
  const data = await retrainModels();
  return sendSuccess(res, {
    data,
    message: "Models trained successfully.",
  });
}

export async function health(req, res) {
  const data = await getHealthStatus();
  return sendSuccess(res, {
    data,
    message: "Service health check passed.",
  });
}
