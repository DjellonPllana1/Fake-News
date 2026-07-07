from __future__ import annotations

import json
import os
import sys

import joblib
import numpy as np

from shared import (
    BEST_MODEL_PATH,
    DEFAULT_CONFIDENCE_THRESHOLD,
    LABELS,
    LEGACY_MODEL_PATH,
    VECTORIZER_PATH,
    normalize_text,
    tokenize_text,
)


def probability_map(class_labels: list[str], probabilities: np.ndarray) -> dict[str, float]:
    payload = {label: 0.0 for label in LABELS}

    for index, label in enumerate(class_labels):
        payload[label] = round(float(probabilities[index]), 4)

    return payload


def binary_probability_map(probabilities: dict[str, float]) -> dict[str, float]:
    real_probability = float(probabilities.get("REAL", 0))
    fake_probability = float(probabilities.get("FAKE", 0))

    if real_probability <= 0 and fake_probability <= 0:
        return {"REAL": 0.5, "FAKE": 0.5}

    total = real_probability + fake_probability
    return {
        "REAL": round(real_probability / total, 4),
        "FAKE": round(fake_probability / total, 4),
    }


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


def top_influential_keywords(classifier, vectorizer, text: str, predicted_label: str, limit: int = 8) -> list[dict[str, object]]:
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


def softmax_rows(values: np.ndarray) -> np.ndarray:
    if values.ndim == 1:
        values = np.column_stack([-values, values])

    shifted = values - np.max(values, axis=1, keepdims=True)
    exp_values = np.exp(shifted)
    return exp_values / exp_values.sum(axis=1, keepdims=True)


def load_artifacts():
    if BEST_MODEL_PATH.exists() and VECTORIZER_PATH.exists():
        model_bundle = joblib.load(BEST_MODEL_PATH)
        vectorizer = joblib.load(VECTORIZER_PATH)
        return model_bundle, vectorizer

    if LEGACY_MODEL_PATH.exists():
        legacy_bundle = joblib.load(LEGACY_MODEL_PATH)

        if isinstance(legacy_bundle, dict):
            if "classifier" in legacy_bundle and "vectorizer" in legacy_bundle:
                return legacy_bundle, legacy_bundle["vectorizer"]

            pipeline = legacy_bundle.get("pipeline")

            if pipeline is not None and hasattr(pipeline, "named_steps"):
                return (
                    {
                        "classifier": pipeline.named_steps["classifier"],
                        "model_id": legacy_bundle.get("model_id", "legacy_pipeline"),
                        "model_name": legacy_bundle.get("model_name", "Legacy Pipeline"),
                        "model_version": legacy_bundle.get("model_version", "legacy"),
                        "generated_at": legacy_bundle.get("generated_at"),
                        "metrics": legacy_bundle.get("metrics"),
                        "preprocessing": legacy_bundle.get("preprocessing"),
                    },
                    pipeline.named_steps["tfidf"],
                )

        raise RuntimeError("A legacy model artifact exists, but it could not be read with the new predictor.")

    raise FileNotFoundError(
        "No trained model artifacts were found. Run `npm run merge:datasets` and `npm run train:models`, or keep using the legacy backend/models artifacts."
    )


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    threshold = float(payload.get("confidence_threshold") or os.getenv("CONFIDENCE_THRESHOLD", str(DEFAULT_CONFIDENCE_THRESHOLD)))
    headline = str(payload.get("headline", "")).strip()
    text = str(payload.get("text", "")).strip()
    combined_text = f"{headline} {text}".strip()
    model_bundle, vectorizer = load_artifacts()
    classifier = model_bundle["classifier"]
    features = vectorizer.transform([combined_text])

    if hasattr(classifier, "predict_proba"):
        probabilities = classifier.predict_proba(features)[0]
    else:
        probabilities = softmax_rows(classifier.decision_function(features))[0]

    class_labels = list(getattr(classifier, "classes_", model_bundle.get("labels", LABELS)))
    best_index = int(np.argmax(probabilities))
    best_probability = float(probabilities[best_index])
    predicted_label = class_labels[best_index]
    ranked_probabilities = sorted(float(value) for value in probabilities)
    margin = ranked_probabilities[-1] - ranked_probabilities[-2] if len(ranked_probabilities) > 1 else ranked_probabilities[-1]
    token_count = len(tokenize_text(combined_text))
    probability_distribution = probability_map(class_labels, probabilities)
    label = predicted_label
    warning = ""

    if token_count < 25:
        label = "UNCERTAIN"
        warning = "The article does not contain enough usable text after preprocessing."
    elif predicted_label != "UNCERTAIN" and best_probability < threshold:
        label = "UNCERTAIN"
        warning = f"Confidence stayed below the configured threshold of {round(threshold * 100)}%."
    elif predicted_label != "UNCERTAIN" and margin < 0.06:
        label = "UNCERTAIN"
        warning = "The top model scores are too close together to make a reliable call."
    elif predicted_label == "UNCERTAIN":
        warning = "The classifier found the article ambiguous enough to assign the UNCERTAIN class directly."

    influential = top_influential_keywords(classifier, vectorizer, combined_text or normalize_text(text), predicted_label)
    confidence_score = float(probability_distribution.get(label, 0) or best_probability)

    print(
        json.dumps(
            {
                "prediction": label,
                "label": label,
                "predicted_label": predicted_label,
                "confidence_score": round(confidence_score, 4),
                "probabilities": probability_distribution,
                "model_probabilities": probability_distribution,
                "binary_probabilities": binary_probability_map(probability_distribution),
                "explanation_keywords": explanation_keywords(influential),
                "top_influential_keywords": influential,
                "model_name": model_bundle.get("model_name", "Automatic Best Model"),
                "model_id": model_bundle.get("model_id"),
                "model_version": model_bundle.get("model_version"),
                "model_generated_at": model_bundle.get("generated_at"),
                "decision_margin": round(margin, 4),
                "metrics": model_bundle.get("metrics"),
                "preprocessing": model_bundle.get("preprocessing"),
                "warning": warning,
            }
        )
    )


if __name__ == "__main__":
    main()
