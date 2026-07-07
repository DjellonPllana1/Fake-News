from __future__ import annotations

import json
import os
import sys

import joblib
import numpy as np

from shared import LABELS, MODEL_PATH, tokenize_text


def probability_map(class_labels: list[str], probabilities: np.ndarray) -> dict[str, float]:
    return {label: round(float(probabilities[index]), 4) for index, label in enumerate(class_labels)}


def fallback_terms(text: str, limit: int = 8) -> list[dict[str, object]]:
    seen = set()
    keywords: list[dict[str, object]] = []

    for token in tokenize_text(text):
        if token in seen:
            continue

        seen.add(token)
        keywords.append(
            {
                "term": token,
                "weight": round(max(0.2, 0.85 - len(keywords) * 0.07), 4),
                "direction": "supports",
            }
        )

        if len(keywords) >= limit:
            break

    return keywords


def resolve_feature_weight_matrix(classifier, class_labels: list[str]) -> np.ndarray | None:
    weight_matrix = None

    if hasattr(classifier, "feature_log_prob_"):
        weight_matrix = np.asarray(classifier.feature_log_prob_)
    elif hasattr(classifier, "coef_"):
        weight_matrix = np.asarray(classifier.coef_)
    elif hasattr(classifier, "calibrated_classifiers_") and classifier.calibrated_classifiers_:
        calibrated = classifier.calibrated_classifiers_[0]
        estimator = getattr(calibrated, "estimator", None) or getattr(calibrated, "base_estimator", None)

        if estimator is not None and hasattr(estimator, "coef_"):
            weight_matrix = np.asarray(estimator.coef_)

    if weight_matrix is None:
        return None

    if weight_matrix.ndim == 1:
        weight_matrix = weight_matrix.reshape(1, -1)

    if weight_matrix.shape[0] == 1 and len(class_labels) == 2:
        weight_matrix = np.vstack([-weight_matrix[0], weight_matrix[0]])

    if weight_matrix.shape[0] != len(class_labels):
        return None

    return weight_matrix


def top_influential_keywords(pipeline, text: str, predicted_label: str, limit: int = 8) -> list[dict[str, object]]:
    vectorizer = pipeline.named_steps["tfidf"]
    classifier = pipeline.named_steps["classifier"]
    transformed = vectorizer.transform([text])
    feature_names = vectorizer.get_feature_names_out()
    row = transformed.toarray()[0]
    non_zero_indexes = np.flatnonzero(row)

    if not len(non_zero_indexes):
        return fallback_terms(text, limit)

    class_labels = list(getattr(classifier, "classes_", LABELS))
    predicted_index = class_labels.index(predicted_label) if predicted_label in class_labels else 0
    weight_matrix = resolve_feature_weight_matrix(classifier, class_labels)
    contributions: list[dict[str, object]] = []
    seen = set()

    for index in non_zero_indexes:
        token = str(feature_names[index]).replace("_", " ").strip()

        if not token or token in seen:
            continue

        seen.add(token)
        tfidf_weight = float(row[index])

        if weight_matrix is None:
            contribution = tfidf_weight
        else:
            contribution = float(tfidf_weight * weight_matrix[predicted_index][index])

        contributions.append(
            {
                "term": token,
                "weight": round(abs(contribution), 4),
                "direction": "supports" if contribution >= 0 else "opposes",
            }
        )

    contributions.sort(key=lambda item: float(item["weight"]), reverse=True)
    filtered = [item for item in contributions if item["weight"] > 0][:limit]
    return filtered or fallback_terms(text, limit)


def explanation_keywords(keywords: list[dict[str, object]]) -> list[str]:
    return [str(item["term"]) for item in keywords[:8]]


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    threshold = float(payload.get("confidence_threshold") or os.getenv("CONFIDENCE_THRESHOLD", "0.72"))
    headline = str(payload.get("headline", "")).strip()
    text = str(payload.get("text", "")).strip()
    combined_text = f"{headline} {text}".strip()

    bundle = joblib.load(MODEL_PATH)
    pipeline = bundle["pipeline"]
    probabilities = pipeline.predict_proba([combined_text])[0]
    class_labels = list(getattr(pipeline.named_steps["classifier"], "classes_", bundle.get("labels", LABELS)))
    best_index = int(np.argmax(probabilities))
    best_probability = float(probabilities[best_index])
    ranked_probabilities = sorted(float(value) for value in probabilities)
    margin = ranked_probabilities[-1] - ranked_probabilities[-2] if len(ranked_probabilities) > 1 else ranked_probabilities[-1]
    token_count = len(tokenize_text(combined_text))
    predicted_label = class_labels[best_index]
    label = predicted_label
    warning = ""

    if token_count < 25:
        label = "UNCERTAIN"
        warning = "The article does not contain enough usable text after preprocessing."
    elif best_probability < threshold:
        label = "UNCERTAIN"
        warning = f"Confidence stayed below the configured threshold of {round(threshold * 100)}%."
    elif margin < 0.08:
        label = "UNCERTAIN"
        warning = "The top model scores are too close together to make a reliable call."

    influential = top_influential_keywords(pipeline, combined_text, predicted_label)

    print(
        json.dumps(
            {
                "label": label,
                "predicted_label": predicted_label,
                "confidence_score": round(best_probability, 4),
                "probabilities": probability_map(class_labels, probabilities),
                "model_probabilities": probability_map(class_labels, probabilities),
                "explanation_keywords": explanation_keywords(influential),
                "top_influential_keywords": influential,
                "model_name": bundle.get("model_name", "Automatic Best Model"),
                "model_id": bundle.get("model_id"),
                "model_version": bundle.get("model_version"),
                "model_generated_at": bundle.get("generated_at"),
                "decision_margin": round(margin, 4),
                "metrics": bundle.get("metrics"),
                "preprocessing": bundle.get("preprocessing"),
                "warning": warning,
            }
        )
    )


if __name__ == "__main__":
    main()
