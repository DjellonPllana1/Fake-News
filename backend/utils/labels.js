export const RESULT_LABELS = ["REAL", "FAKE", "UNCERTAIN"];

export function normalizeResultLabel(value = "") {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "REAL" || normalized === "TRUE") {
    return "REAL";
  }

  if (normalized === "FAKE" || normalized === "FALSE") {
    return "FAKE";
  }

  if (["UNCERTAIN", "NEEDS REVIEW", "SATIRE", "BIAS", "UNKNOWN"].includes(normalized)) {
    return "UNCERTAIN";
  }

  return "UNCERTAIN";
}

export function clampConfidence(value) {
  return Math.min(1, Math.max(0, Number(value || 0)));
}

export function getRiskLevel(label, confidenceScore = 0) {
  const normalizedLabel = normalizeResultLabel(label);
  const confidence = clampConfidence(confidenceScore);

  if (normalizedLabel === "FAKE") {
    return confidence >= 0.8 ? "HIGH" : "MEDIUM";
  }

  if (normalizedLabel === "REAL") {
    return confidence >= 0.8 ? "LOW" : "MEDIUM";
  }

  return confidence < 0.55 ? "HIGH" : "MEDIUM";
}

export function summarizeDistribution(items = []) {
  return RESULT_LABELS.map((label) => ({
    label,
    value: items.filter((item) => normalizeResultLabel(item.label) === label).length,
  }));
}
