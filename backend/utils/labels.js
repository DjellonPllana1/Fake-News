/**
 * ============================================================================
 * MENAXHUESI I ETIKETAVE DHE NIVELIT TË RREZIKUT (labels.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar përcakton tre rezultatet e mundshme të një lajmi:
 * 1. REAL (I Vërtetë) -> Lajmi mbështetet nga faktet dhe stili gazetaresk.
 * 2. FAKE (I Rremë) -> Lajmi përmban mashtrime, sajesa ose gjuhë manipulative.
 * 3. UNCERTAIN (I Pasigurt) -> Mungojnë provat për të dalë në një përfundim të prerë.
 * 
 * Gjithashtu llogarit "Nivelin e Rrezikut" (Risk Level):
 * - HIGH (Rrezik i Lartë): kur lajmi është zbuluar si i rremë me siguri të lartë.
 * - MEDIUM (Rrezik Mesatar): kur lajmi kërkon verifikim shtesë nga njeriu.
 * - LOW (Rrezik i Ulët): kur lajmi është i sigurt dhe i vërtetë.
 */

export const RESULT_LABELS = ["REAL", "FAKE", "UNCERTAIN"];

/**
 * Standardizon fjalët e ndryshme (p.sh. "True" kthehet në "REAL", "False" në "FAKE").
 */
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

/**
 * Kufizon përqindjen e sigurisë midis 0 (0%) dhe 1 (100%).
 */
export function clampConfidence(value) {
  return Math.min(1, Math.max(0, Number(value || 0)));
}

/**
 * Përcakton nivelin e rrezikut bazuar te rezultati dhe përqindja e sigurisë.
 */
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

/**
 * Përmbledh numrin e artikujve për secilën nga 3 kategoritë kryesore.
 */
export function summarizeDistribution(items = []) {
  return RESULT_LABELS.map((label) => ({
    label,
    value: items.filter((item) => normalizeResultLabel(item.label) === label).length,
  }));
}
