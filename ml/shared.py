from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer

ROOT_DIR = Path(__file__).resolve().parents[1]
DATABASE_PATH = ROOT_DIR / "backend" / "database.json"
MODEL_PATH = ROOT_DIR / "backend" / "models" / "best_model.joblib"
METRICS_PATH = ROOT_DIR / "backend" / "models" / "model_metrics.json"
TRAINING_REPORT_PATH = ROOT_DIR / "backend" / "models" / "training_report.json"
LABELS = ["FAKE", "REAL"]
RANDOM_STATE = 42

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


def normalize_label(value: str | None) -> str | None:
    normalized = str(value or "").strip().upper()

    if normalized in {"FAKE", "FALSE"}:
        return "FAKE"

    if normalized in {"REAL", "TRUE"}:
        return "REAL"

    return None


def normalize_text(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"https?://\S+", " ", normalized)
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def tokenize_text(value: str | None) -> list[str]:
    tokens = []

    for word in normalize_text(value).split():
        if len(word) < 3 or word in STOP_WORDS or word.isdigit():
            continue

        stemmed = STEMMER.stem(word)

        if len(stemmed) >= 3 and stemmed not in STOP_WORDS:
            tokens.append(stemmed)

    return tokens


def build_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        preprocessor=normalize_text,
        tokenizer=tokenize_text,
        token_pattern=None,
        lowercase=False,
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.97,
        sublinear_tf=True,
        strip_accents="unicode",
    )


def combine_article_fields(article: dict) -> str:
    return f"{article.get('title', '')} {article.get('text', '')}".strip()


def load_training_records() -> tuple[list[str], list[str], dict[str, int]]:
    database = json.loads(DATABASE_PATH.read_text(encoding="utf-8"))
    records = []

    for article in database.get("articles", []):
        label = normalize_label(article.get("label"))

        if label not in LABELS:
            continue

        combined = combine_article_fields(article)

        if len(combined) < 80:
            continue

        records.append((combined, label))

    if len(records) < 100:
        raise RuntimeError("Not enough labeled training records were found in backend/database.json.")

    texts = [text for text, _label in records]
    labels = [label for _text, label in records]
    distribution = dict(Counter(labels))
    return texts, labels, distribution


def preprocessing_config() -> dict:
    return {
        "lowercase": True,
        "remove_urls": True,
        "remove_punctuation": True,
        "remove_stopwords": True,
        "stemming": "PorterStemmer",
        "vectorizer": "TF-IDF",
        "ngram_range": [1, 2],
        "min_df": 2,
        "max_df": 0.97,
        "sublinear_tf": True,
    }
