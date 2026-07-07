from __future__ import annotations

import argparse
import json
from collections import Counter

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from merge_datasets import merge_available_datasets
from shared import (
    BEST_MODEL_PATH,
    DATASET_REPORT_PATH,
    DEFAULT_CONFIDENCE_THRESHOLD,
    FINAL_DATASET_PATH,
    LABELS,
    LABEL_MAPPING_PATH,
    LEGACY_METRICS_PATH,
    LEGACY_MODEL_PATH,
    LEGACY_TRAINING_REPORT_PATH,
    METRICS_PATH,
    MODEL_CARD_PATH,
    RANDOM_STATE,
    VECTORIZER_PATH,
    build_label_mapping,
    build_model_version,
    build_vectorizer,
    combine_record_text,
    ensure_directories,
    load_final_dataset_records,
    now_utc_iso,
    preprocessing_config,
    relative_to_root,
    write_json,
)


def softmax_rows(values: np.ndarray) -> np.ndarray:
    if values.ndim == 1:
        values = np.column_stack([-values, values])

    shifted = values - np.max(values, axis=1, keepdims=True)
    exp_values = np.exp(shifted)
    return exp_values / exp_values.sum(axis=1, keepdims=True)


def probability_matrix(classifier, features) -> np.ndarray:
    if hasattr(classifier, "predict_proba"):
        return classifier.predict_proba(features)

    return softmax_rows(classifier.decision_function(features))


def classifier_candidates() -> dict[str, tuple[str, object]]:
    return {
        "multinomial_naive_bayes": ("Multinomial Naive Bayes", MultinomialNB(alpha=0.35)),
        "logistic_regression": (
            "Logistic Regression",
            LogisticRegression(
                max_iter=3000,
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


def confusion_matrix_as_dict(matrix: np.ndarray, labels: list[str]) -> dict[str, dict[str, int]]:
    payload: dict[str, dict[str, int]] = {}

    for actual_index, actual_label in enumerate(labels):
        payload[actual_label] = {}

        for predicted_index, predicted_label in enumerate(labels):
            payload[actual_label][predicted_label] = int(matrix[actual_index][predicted_index])

    return payload


def safe_stratify(labels: list[str]) -> list[str] | None:
    counts = Counter(labels)

    if len(counts) < 2:
        raise RuntimeError("At least two distinct labels are required to train the classifier.")

    if min(counts.values()) < 2:
        return None

    return labels


def evaluate_classifier(model_id: str, name: str, classifier, x_test_matrix, y_test: list[str], labels: list[str]) -> dict[str, object]:
    probabilities = probability_matrix(classifier, x_test_matrix)
    class_labels = list(getattr(classifier, "classes_", labels))
    predictions = [class_labels[index] for index in np.argmax(probabilities, axis=1)]
    accuracy = accuracy_score(y_test, predictions)
    macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(
        y_test,
        predictions,
        labels=class_labels,
        average="macro",
        zero_division=0,
    )
    weighted_precision, weighted_recall, weighted_f1, _ = precision_recall_fscore_support(
        y_test,
        predictions,
        labels=class_labels,
        average="weighted",
        zero_division=0,
    )
    matrix = confusion_matrix(y_test, predictions, labels=class_labels)

    return {
        "id": model_id,
        "name": name,
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(macro_precision), 4),
        "recall": round(float(macro_recall), 4),
        "f1": round(float(macro_f1), 4),
        "macro_precision": round(float(macro_precision), 4),
        "macro_recall": round(float(macro_recall), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_precision": round(float(weighted_precision), 4),
        "weighted_recall": round(float(weighted_recall), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "labels": class_labels,
        "confusion_matrix": matrix.tolist(),
        "confusion_matrix_named": confusion_matrix_as_dict(matrix, class_labels),
        "classification_report": classification_report(
            y_test,
            predictions,
            labels=class_labels,
            output_dict=True,
            zero_division=0,
        ),
    }


def select_best_model(candidates: list[dict[str, object]]) -> dict[str, object]:
    return max(
        candidates,
        key=lambda candidate: (
            candidate["metrics"]["macro_f1"],
            candidate["metrics"]["accuracy"],
            candidate["metrics"]["macro_precision"],
        ),
    )


def build_training_report(best_candidate: dict[str, object], dataset: dict[str, object]) -> dict[str, object]:
    return {
        "best_model": best_candidate["metrics"]["name"],
        "model_version": best_candidate["model_version"],
        "accuracy": best_candidate["metrics"]["accuracy"],
        "precision": best_candidate["metrics"]["precision"],
        "recall": best_candidate["metrics"]["recall"],
        "f1": best_candidate["metrics"]["f1"],
        "confusion_matrix": best_candidate["metrics"]["confusion_matrix_named"],
        "dataset_size": dataset["total_samples"],
        "test_size": dataset["test_samples"],
    }


def build_model_card(
    *,
    best_candidate: dict[str, object],
    dataset_summary: dict[str, object],
    preprocessing: dict[str, object],
    merge_report: dict[str, object],
) -> dict[str, object]:
    return {
        "model_name": best_candidate["name"],
        "model_id": best_candidate["id"],
        "model_version": best_candidate["model_version"],
        "generated_at": best_candidate["generated_at"],
        "task": "Fake news detection with hybrid article and claim datasets",
        "summary": "TF-IDF text features trained across multiple normalized fake-news datasets with automatic best-model selection by macro F1-score.",
        "datasets_used": merge_report.get("available_datasets", []),
        "final_dataset_path": relative_to_root(FINAL_DATASET_PATH),
        "dataset_report_path": relative_to_root(DATASET_REPORT_PATH),
        "training_samples": dataset_summary["training_samples"],
        "test_samples": dataset_summary["test_samples"],
        "label_distribution": dataset_summary["label_distribution"],
        "preprocessing": preprocessing,
        "evaluation": {
            "accuracy": best_candidate["metrics"]["accuracy"],
            "macro_precision": best_candidate["metrics"]["macro_precision"],
            "macro_recall": best_candidate["metrics"]["macro_recall"],
            "macro_f1": best_candidate["metrics"]["macro_f1"],
            "confusion_matrix": best_candidate["metrics"]["confusion_matrix_named"],
        },
        "limitations": [
            "The model is a probabilistic text classifier and does not replace source verification or editorial review.",
            "Results depend on dataset quality, class balance, and the quality of pasted article text or claim text.",
            "Low-confidence predictions are surfaced as UNCERTAIN to reduce overconfident misclassification.",
        ],
    }


def load_training_records() -> tuple[list[str], list[str], dict[str, object], dict[str, object]]:
    merge_report = merge_available_datasets()
    records = load_final_dataset_records()

    if len(records) < 20:
        raise RuntimeError("The merged dataset is too small to train reliably. Add more supported dataset files first.")

    texts = [combine_record_text(record) for record in records]
    labels = [record["label"] for record in records]
    distribution = dict(Counter(labels))
    dataset_types = dict(Counter(record["dataset_type"] for record in records))
    dataset_summary = {
        "total_samples": len(records),
        "label_distribution": distribution,
        "dataset_type_distribution": dataset_types,
        "datasets_used": merge_report.get("available_datasets", []),
    }
    return texts, labels, dataset_summary, merge_report


def save_artifacts(
    *,
    best_candidate: dict[str, object],
    vectorizer,
    metrics_payload: dict[str, object],
    model_card: dict[str, object],
    training_report: dict[str, object],
    preprocessing: dict[str, object],
) -> None:
    ensure_directories()

    best_model_bundle = {
        "classifier": best_candidate["classifier"],
        "model_id": best_candidate["id"],
        "model_name": best_candidate["name"],
        "model_version": best_candidate["model_version"],
        "labels": best_candidate["metrics"]["labels"],
        "generated_at": best_candidate["generated_at"],
        "metrics": best_candidate["metrics"],
        "preprocessing": preprocessing,
    }
    joblib.dump(best_model_bundle, BEST_MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    write_json(LABEL_MAPPING_PATH, build_label_mapping(best_candidate["metrics"]["labels"]))
    write_json(METRICS_PATH, metrics_payload)
    write_json(MODEL_CARD_PATH, model_card)

    legacy_pipeline = Pipeline(
        [
            ("tfidf", vectorizer),
            ("classifier", best_candidate["classifier"]),
        ]
    )
    legacy_bundle = {
        **best_model_bundle,
        "pipeline": legacy_pipeline,
        "vectorizer": vectorizer,
    }
    joblib.dump(legacy_bundle, LEGACY_MODEL_PATH)
    write_json(LEGACY_METRICS_PATH, metrics_payload)
    write_json(LEGACY_TRAINING_REPORT_PATH, training_report)


def run_training(save_outputs: bool = True) -> dict[str, object]:
    texts, labels, dataset_summary, merge_report = load_training_records()
    stratify_labels = safe_stratify(labels)
    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=stratify_labels,
    )
    vectorizer = build_vectorizer(len(x_train))
    x_train_matrix = vectorizer.fit_transform(x_train)
    x_test_matrix = vectorizer.transform(x_test)
    active_labels = [label for label in LABELS if label in set(labels)]
    trained_candidates: list[dict[str, object]] = []

    for model_id, (name, estimator) in classifier_candidates().items():
        classifier = estimator
        classifier.fit(x_train_matrix, y_train)
        metrics = evaluate_classifier(model_id, name, classifier, x_test_matrix, y_test, active_labels)
        trained_candidates.append(
            {
                "id": model_id,
                "name": name,
                "classifier": classifier,
                "metrics": metrics,
            }
        )

    best_candidate = select_best_model(trained_candidates)
    generated_at = now_utc_iso()
    model_version = build_model_version(best_candidate["id"], generated_at)
    best_candidate["generated_at"] = generated_at
    best_candidate["model_version"] = model_version

    for candidate in trained_candidates:
        candidate["metrics"]["version"] = build_model_version(candidate["id"], generated_at)

    preprocessing = preprocessing_config(len(x_train))
    dataset_summary = {
        **dataset_summary,
        "training_samples": len(x_train),
        "test_samples": len(x_test),
    }
    training_report = build_training_report(best_candidate, dataset_summary)
    metrics_payload = {
        "status": "trained" if save_outputs else "evaluated",
        "generated_at": generated_at,
        "model_version": model_version,
        "dataset": {
            **dataset_summary,
            "final_dataset_path": relative_to_root(FINAL_DATASET_PATH),
            "dataset_report_path": relative_to_root(DATASET_REPORT_PATH),
        },
        "preprocessing": preprocessing,
        "decision_policy": {
            "confidence_threshold_default": DEFAULT_CONFIDENCE_THRESHOLD,
            "low_confidence_label": "UNCERTAIN",
        },
        "artifacts": {
            "best_model": relative_to_root(BEST_MODEL_PATH),
            "vectorizer": relative_to_root(VECTORIZER_PATH),
            "metrics": relative_to_root(METRICS_PATH),
            "label_mapping": relative_to_root(LABEL_MAPPING_PATH),
            "model_card": relative_to_root(MODEL_CARD_PATH),
            "dataset_report": relative_to_root(DATASET_REPORT_PATH),
        },
        "best_model": {
            **best_candidate["metrics"],
            "artifact_path": relative_to_root(BEST_MODEL_PATH),
            "vectorizer_path": relative_to_root(VECTORIZER_PATH),
            "version": model_version,
        },
        "models": [candidate["metrics"] for candidate in trained_candidates],
        "validation_report": merge_report,
    }
    model_card = build_model_card(
        best_candidate=best_candidate,
        dataset_summary=dataset_summary,
        preprocessing=preprocessing,
        merge_report=merge_report,
    )

    if save_outputs:
        save_artifacts(
            best_candidate=best_candidate,
            vectorizer=vectorizer,
            metrics_payload=metrics_payload,
            model_card=model_card,
            training_report=training_report,
            preprocessing=preprocessing,
        )

    return metrics_payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and compare fake-news classifiers against the merged dataset.")
    parser.add_argument("--evaluate-only", action="store_true", help="Compare models without overwriting artifacts.")
    args = parser.parse_args()
    print(json.dumps(run_training(save_outputs=not args.evaluate_only)))


if __name__ == "__main__":
    main()
