from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from shared import (
    LABELS,
    METRICS_PATH,
    MODEL_PATH,
    RANDOM_STATE,
    TRAINING_REPORT_PATH,
    build_vectorizer,
    load_training_records,
    preprocessing_config,
)


def softmax_rows(values: np.ndarray) -> np.ndarray:
    if values.ndim == 1:
        values = np.column_stack([-values, values])

    shifted = values - np.max(values, axis=1, keepdims=True)
    exp_values = np.exp(shifted)
    return exp_values / exp_values.sum(axis=1, keepdims=True)


def probability_matrix(pipeline: Pipeline, texts: list[str]) -> np.ndarray:
    classifier = pipeline.named_steps["classifier"]

    if hasattr(classifier, "predict_proba"):
        return pipeline.predict_proba(texts)

    return softmax_rows(pipeline.decision_function(texts))


def classifier_candidates() -> dict[str, tuple[str, object]]:
    return {
        "multinomial_naive_bayes": ("Multinomial Naive Bayes", MultinomialNB(alpha=0.35)),
        "logistic_regression": (
            "Logistic Regression",
            LogisticRegression(
                max_iter=2500,
                class_weight="balanced",
                solver="liblinear",
                random_state=RANDOM_STATE,
            ),
        ),
        "linear_svm": (
            "Linear SVM",
            CalibratedClassifierCV(
                estimator=LinearSVC(C=1.0, class_weight="balanced", random_state=RANDOM_STATE),
                method="sigmoid",
                cv=5,
            ),
        ),
    }


def train_pipeline(estimator: object) -> Pipeline:
    return Pipeline(
        [
            ("tfidf", build_vectorizer()),
            ("classifier", estimator),
        ]
    )


def confusion_matrix_as_dict(matrix: np.ndarray, labels: list[str]) -> dict[str, dict[str, int]]:
    payload: dict[str, dict[str, int]] = {}

    for actual_index, actual_label in enumerate(labels):
        payload[actual_label] = {}

        for predicted_index, predicted_label in enumerate(labels):
            payload[actual_label][predicted_label] = int(matrix[actual_index][predicted_index])

    return payload


def evaluate_pipeline(model_id: str, name: str, pipeline: Pipeline, x_test: list[str], y_test: list[str]) -> dict:
    probabilities = probability_matrix(pipeline, x_test)
    class_labels = list(pipeline.named_steps["classifier"].classes_)
    predictions = [class_labels[index] for index in np.argmax(probabilities, axis=1)]
    accuracy = accuracy_score(y_test, predictions)
    precision, recall, f1, _support = precision_recall_fscore_support(y_test, predictions, average="weighted", zero_division=0)
    matrix = confusion_matrix(y_test, predictions, labels=class_labels)

    return {
        "id": model_id,
        "name": name,
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "labels": class_labels,
        "confusion_matrix": matrix.tolist(),
        "confusion_matrix_named": confusion_matrix_as_dict(matrix, class_labels),
        "classification_report": classification_report(y_test, predictions, labels=class_labels, output_dict=True, zero_division=0),
    }


def select_best_model(candidates: list[dict]) -> dict:
    return max(candidates, key=lambda candidate: (candidate["metrics"]["f1"], candidate["metrics"]["accuracy"], candidate["metrics"]["precision"]))


def build_model_version(model_id: str, generated_at: str) -> str:
    compact_timestamp = generated_at.replace("-", "").replace(":", "").replace("T", "-").replace("Z", "")
    return f"{model_id}-{compact_timestamp}"


def write_training_report(best_candidate: dict, x_test: list[str]) -> None:
    report = {
        "best_model": best_candidate["metrics"]["name"],
        "model_version": best_candidate["model_version"],
        "accuracy": best_candidate["metrics"]["accuracy"],
        "precision": best_candidate["metrics"]["precision"],
        "recall": best_candidate["metrics"]["recall"],
        "f1": best_candidate["metrics"]["f1"],
        "confusion_matrix": best_candidate["metrics"]["confusion_matrix_named"],
        "test_size": len(x_test),
    }
    TRAINING_REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")


def run_training(save_artifacts: bool = True) -> dict:
    texts, labels, distribution = load_training_records()
    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=labels,
    )

    trained_candidates = []

    for model_id, (name, estimator) in classifier_candidates().items():
        pipeline = train_pipeline(estimator)
        pipeline.fit(x_train, y_train)
        metrics = evaluate_pipeline(model_id, name, pipeline, x_test, y_test)
        trained_candidates.append(
            {
                "id": model_id,
                "name": name,
                "pipeline": pipeline,
                "metrics": metrics,
            }
        )

    best_candidate = select_best_model(trained_candidates)
    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    model_version = build_model_version(best_candidate["id"], generated_at)
    best_candidate["model_version"] = model_version

    payload = {
        "status": "trained" if save_artifacts else "evaluated",
        "generated_at": generated_at,
        "model_version": model_version,
        "dataset": {
            "total_samples": len(texts),
            "training_samples": len(x_train),
            "test_samples": len(x_test),
            "label_distribution": distribution,
        },
        "preprocessing": preprocessing_config(),
        "decision_policy": {
            "confidence_threshold_default": 0.72,
            "low_confidence_label": "UNCERTAIN",
        },
        "best_model": {
            **best_candidate["metrics"],
            "artifact_path": str(MODEL_PATH.relative_to(MODEL_PATH.parents[2])),
            "version": model_version,
        },
        "models": [candidate["metrics"] for candidate in trained_candidates],
    }

    if save_artifacts:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "pipeline": best_candidate["pipeline"],
                "model_id": best_candidate["id"],
                "model_name": best_candidate["name"],
                "model_version": model_version,
                "labels": best_candidate["metrics"]["labels"],
                "generated_at": generated_at,
                "metrics": best_candidate["metrics"],
                "preprocessing": preprocessing_config(),
            },
            MODEL_PATH,
        )
        METRICS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        write_training_report(best_candidate, x_test)

    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evaluate-only", action="store_true", help="Compare models without saving the best artifact.")
    args = parser.parse_args()
    result = run_training(save_artifacts=not args.evaluate_only)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
