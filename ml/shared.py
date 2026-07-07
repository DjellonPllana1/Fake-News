from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable

from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer

ROOT_DIR = Path(__file__).resolve().parents[1]
ML_DIR = ROOT_DIR / "ml"
RAW_DATASET_DIR = ML_DIR / "datasets" / "raw"
PROCESSED_DATASET_DIR = ML_DIR / "datasets" / "processed"
MODEL_DIR = ML_DIR / "models"
METRICS_DIR = ML_DIR / "metrics"
LEGACY_MODEL_DIR = ROOT_DIR / "backend" / "models"

FINAL_DATASET_PATH = PROCESSED_DATASET_DIR / "final_dataset.csv"
DATASET_REPORT_PATH = METRICS_DIR / "dataset_report.json"
BEST_MODEL_PATH = MODEL_DIR / "best_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"
METRICS_PATH = METRICS_DIR / "metrics.json"
LABEL_MAPPING_PATH = MODEL_DIR / "label_mapping.json"
MODEL_CARD_PATH = MODEL_DIR / "model_card.json"

LEGACY_MODEL_PATH = LEGACY_MODEL_DIR / "best_model.joblib"
LEGACY_METRICS_PATH = LEGACY_MODEL_DIR / "model_metrics.json"
LEGACY_TRAINING_REPORT_PATH = LEGACY_MODEL_DIR / "training_report.json"

LABELS = ["FAKE", "REAL", "UNCERTAIN"]
REQUIRED_COLUMNS = ["text", "title", "label", "source", "dataset_type"]
RANDOM_STATE = 42
DEFAULT_CONFIDENCE_THRESHOLD = 0.72
MINIMUM_TRAINING_ROWS = 50

DATASET_EXPECTATIONS = {
    "kaggle_fake_real": {
        "description": "Kaggle Fake and Real News Dataset",
        "source_url": "https://www.kaggle.com/datasets/clmentbisaillon/fake-and-real-news-dataset",
        "files": [
            RAW_DATASET_DIR / "kaggle" / "Fake.csv",
            RAW_DATASET_DIR / "kaggle" / "True.csv",
        ],
        "fallback_files": [
            RAW_DATASET_DIR / "Fake.csv",
            RAW_DATASET_DIR / "True.csv",
        ],
        "processed_file": PROCESSED_DATASET_DIR / "kaggle_fake_real.csv",
    },
    "liar": {
        "description": "LIAR Dataset",
        "source_url": "https://www.cs.ucsb.edu/~william/data/liar_dataset.zip",
        "files": [
            RAW_DATASET_DIR / "liar" / "train.tsv",
            RAW_DATASET_DIR / "liar" / "valid.tsv",
            RAW_DATASET_DIR / "liar" / "test.tsv",
        ],
        "processed_file": PROCESSED_DATASET_DIR / "liar.csv",
    },
    "fever": {
        "description": "FEVER-style Claim Verification Dataset",
        "source_url": "https://fever.ai/dataset/fever.html",
        "files": [
            RAW_DATASET_DIR / "fever" / "fever-train.jsonl",
            RAW_DATASET_DIR / "fever" / "fever-dev.jsonl",
        ],
        "processed_file": PROCESSED_DATASET_DIR / "fever.csv",
    },
}

CUSTOM_STOP_WORDS = {
    "also",
    "could",
    "would",
    "there",
    "their",
    "about",
    "after",
    "before",
    "while",
    "which",
    "where",
    "when",
    "those",
    "these",
}
STOP_WORDS = set(ENGLISH_STOP_WORDS).union(CUSTOM_STOP_WORDS)
STEMMER = PorterStemmer()
ENGLISH_MARKERS = {
    "the",
    "and",
    "of",
    "to",
    "in",
    "that",
    "with",
    "for",
    "on",
    "said",
    "from",
    "after",
    "according",
    "officials",
}


@dataclass
class DatasetBundle:
    dataset_name: str
    dataset_type: str
    source_files: list[Path]
    records: list[dict[str, str]]
    raw_row_count: int
    notes: list[str]


def ensure_directories() -> None:
    for directory in [
        RAW_DATASET_DIR,
        PROCESSED_DATASET_DIR,
        MODEL_DIR,
        METRICS_DIR,
        LEGACY_MODEL_DIR,
    ]:
        directory.mkdir(parents=True, exist_ok=True)


def now_utc_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def relative_to_root(path: Path) -> str:
    return str(path.resolve().relative_to(ROOT_DIR)).replace("/", "\\")


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def normalize_label(value: str | None) -> str | None:
    normalized = str(value or "").strip().upper()

    if normalized in {"FAKE", "FALSE", "REFUTES", "REFUTED"}:
        return "FAKE"

    if normalized in {"REAL", "TRUE", "SUPPORTS", "SUPPORTED"}:
        return "REAL"

    if normalized in {
        "UNCERTAIN",
        "NEI",
        "NOT ENOUGH INFO",
        "HALF-TRUE",
        "HALF TRUE",
        "BARELY-TRUE",
        "BARELY TRUE",
        "MIXED",
        "UNKNOWN",
        "UNVERIFIED",
    }:
        return "UNCERTAIN"

    return None


def normalize_text(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"https?://\S+", " ", normalized)
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def normalize_whitespace(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def tokenize_text(value: str | None) -> list[str]:
    tokens: list[str] = []

    for word in normalize_text(value).split():
        if len(word) < 3 or word in STOP_WORDS or word.isdigit():
            continue

        stemmed = STEMMER.stem(word)

        if len(stemmed) >= 3 and stemmed not in STOP_WORDS:
            tokens.append(stemmed)

    return tokens


def build_vectorizer(sample_count: int | None = None) -> TfidfVectorizer:
    min_df = 1 if sample_count and sample_count < 200 else 2

    return TfidfVectorizer(
        preprocessor=normalize_text,
        tokenizer=tokenize_text,
        token_pattern=None,
        lowercase=False,
        ngram_range=(1, 2),
        min_df=min_df,
        max_df=0.97,
        sublinear_tf=True,
        strip_accents="unicode",
    )


def preprocessing_config(sample_count: int | None = None) -> dict[str, object]:
    return {
        "lowercase": True,
        "remove_urls": True,
        "remove_punctuation": True,
        "remove_stopwords": True,
        "stemming": "PorterStemmer",
        "vectorizer": "TF-IDF",
        "ngram_range": [1, 2],
        "min_df": 1 if sample_count and sample_count < 200 else 2,
        "max_df": 0.97,
        "sublinear_tf": True,
    }


def build_title_from_text(text: str, limit: int = 110) -> str:
    cleaned = normalize_whitespace(text)

    if not cleaned:
        return "Untitled Record"

    sentence = re.split(r"(?<=[.!?])\s+", cleaned, maxsplit=1)[0]
    return sentence[:limit].strip() or cleaned[:limit].strip()


def normalize_common_record(text: str, title: str, label: str, source: str, dataset_type: str) -> dict[str, str]:
    normalized_label = normalize_label(label)

    if normalized_label not in LABELS:
        raise ValueError(f"Unsupported label '{label}'.")

    return {
        "text": normalize_whitespace(text),
        "title": normalize_whitespace(title),
        "label": normalized_label,
        "source": normalize_whitespace(source) or "Unknown source",
        "dataset_type": normalize_whitespace(dataset_type) or "general",
    }


def combine_record_text(record: dict[str, str]) -> str:
    title = normalize_whitespace(record.get("title", ""))
    text = normalize_whitespace(record.get("text", ""))

    if title and text and text.lower().startswith(title.lower()):
        return text

    return f"{title} {text}".strip()


def read_csv_rows(path: Path, delimiter: str = ",") -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=delimiter)
        return [{key: str(value or "") for key, value in row.items()} for row in reader]


def read_jsonl_rows(path: Path) -> list[dict]:
    rows: list[dict] = []

    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()

            if not stripped:
                continue

            rows.append(json.loads(stripped))

    return rows


def write_csv_rows(path: Path, rows: Iterable[dict[str, object]], fieldnames: list[str] | None = None) -> None:
    fieldnames = fieldnames or REQUIRED_COLUMNS
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()

        for row in rows:
            writer.writerow({column: row.get(column, "") for column in fieldnames})


def read_processed_dataset(path: Path) -> list[dict[str, str]]:
    rows = read_csv_rows(path)
    cleaned_rows = []

    for row in rows:
        cleaned_rows.append(
            normalize_common_record(
                text=row.get("text", ""),
                title=row.get("title", ""),
                label=row.get("label", ""),
                source=row.get("source", ""),
                dataset_type=row.get("dataset_type", ""),
            )
        )

    return cleaned_rows


def language_hint(text: str) -> str:
    tokens = normalize_text(text).split()

    if not tokens:
        return "unknown"

    marker_hits = sum(1 for token in tokens[:120] if token in ENGLISH_MARKERS)
    return "en" if marker_hits >= 2 else "unknown"


def record_signature(record: dict[str, str]) -> str:
    normalized_title = normalize_text(record.get("title", ""))
    normalized_body = normalize_text(record.get("text", ""))
    return f"{normalized_title}||{normalized_body}"


def deduplicate_records(records: list[dict[str, str]]) -> tuple[list[dict[str, str]], int]:
    deduped: list[dict[str, str]] = []
    seen = set()
    duplicate_count = 0

    for record in records:
        signature = record_signature(record)

        if signature in seen:
            duplicate_count += 1
            continue

        seen.add(signature)
        deduped.append(record)

    return deduped, duplicate_count


def summarize_dataset(
    *,
    dataset_name: str,
    dataset_type: str,
    records: list[dict[str, str]],
    raw_row_count: int,
    source_files: list[Path],
    processed_file: Path,
    notes: list[str] | None = None,
) -> tuple[list[dict[str, str]], dict[str, object]]:
    notes = notes or []
    missing_required_columns = sorted({column for column in REQUIRED_COLUMNS if any(column not in record for record in records)} or [])
    empty_text_rows = sum(1 for record in records if not normalize_whitespace(record.get("text", "")))
    empty_title_rows = sum(1 for record in records if not normalize_whitespace(record.get("title", "")))
    label_distribution_before = dict(Counter(record.get("label", "") for record in records))
    language_distribution_before = dict(Counter(language_hint(record.get("text", "")) for record in records))
    non_empty_records = [record for record in records if normalize_whitespace(record.get("text", ""))]
    cleaned_records, duplicate_rows = deduplicate_records(non_empty_records)
    label_distribution = dict(Counter(record["label"] for record in cleaned_records))
    dataset_type_distribution = dict(Counter(record["dataset_type"] for record in cleaned_records))
    language_distribution = dict(Counter(language_hint(record["text"]) for record in cleaned_records))

    warnings: list[str] = []

    if missing_required_columns:
        warnings.append(f"Missing required normalized columns: {', '.join(missing_required_columns)}.")

    if empty_text_rows:
        warnings.append(f"Removed {empty_text_rows} row(s) with empty text.")

    if duplicate_rows:
        warnings.append(f"Removed {duplicate_rows} duplicate row(s).")

    if len(cleaned_records) < MINIMUM_TRAINING_ROWS:
        warnings.append(
            f"{dataset_name} contains {len(cleaned_records)} cleaned row(s), which is below the recommended minimum of {MINIMUM_TRAINING_ROWS}."
        )

    unknown_language_count = language_distribution.get("unknown", 0)

    if cleaned_records and unknown_language_count / len(cleaned_records) > 0.2:
        warnings.append("More than 20% of rows could not be confidently identified as English.")

    report = {
        "dataset_name": dataset_name,
        "dataset_type": dataset_type,
        "status": "ready",
        "source_files": [relative_to_root(path) for path in source_files],
        "processed_file": relative_to_root(processed_file),
        "required_columns": REQUIRED_COLUMNS,
        "missing_required_columns": missing_required_columns,
        "raw_row_count": raw_row_count,
        "dataset_size": len(cleaned_records),
        "rows_before_cleaning": len(records),
        "rows_after_cleaning": len(cleaned_records),
        "empty_text_rows": empty_text_rows,
        "empty_title_rows": empty_title_rows,
        "duplicate_rows": duplicate_rows,
        "label_distribution_before_cleaning": label_distribution_before,
        "label_distribution": label_distribution,
        "dataset_type_distribution": dataset_type_distribution,
        "language_distribution_before_cleaning": language_distribution_before,
        "language_distribution": language_distribution,
        "notes": notes,
        "warnings": warnings,
    }
    return cleaned_records, report


def build_missing_dataset_report(dataset_name: str) -> dict[str, object]:
    spec = DATASET_EXPECTATIONS[dataset_name]
    expected_files = [relative_to_root(path) for path in spec["files"]]

    if spec.get("fallback_files"):
        expected_files.extend(relative_to_root(path) for path in spec["fallback_files"])

    return {
        "dataset_name": dataset_name,
        "dataset_type": dataset_name,
        "status": "missing",
        "description": spec["description"],
        "source_url": spec["source_url"],
        "expected_files": expected_files,
        "processed_file": relative_to_root(spec["processed_file"]),
        "warnings": ["Dataset files were not found, so this dataset was skipped."],
    }


def dataset_distribution(records: list[dict[str, str]]) -> dict[str, int]:
    return dict(Counter(record["label"] for record in records))


def dataset_type_distribution(records: list[dict[str, str]]) -> dict[str, int]:
    return dict(Counter(record["dataset_type"] for record in records))


def build_label_mapping(labels: list[str]) -> dict[str, object]:
    ordered = [label for label in LABELS if label in labels]
    return {
        "labels": ordered,
        "indices": {label: index for index, label in enumerate(ordered)},
        "canonical_labels": LABELS,
    }


def build_model_version(model_id: str, generated_at: str) -> str:
    compact_timestamp = generated_at.replace("-", "").replace(":", "").replace("T", "-").replace("Z", "")
    return f"{model_id}-{compact_timestamp}"


def load_final_dataset_records() -> list[dict[str, str]]:
    if not FINAL_DATASET_PATH.exists():
        raise FileNotFoundError(
            "The merged dataset was not found. Run `npm run merge:datasets` after placing the supported raw dataset files."
        )

    return read_processed_dataset(FINAL_DATASET_PATH)
