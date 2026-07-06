import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

MIN_TOKEN_LENGTH = 3
MIN_ORIGINAL_WORDS = 45
MIN_KNOWN_UNIGRAMS = 12
MIN_VOCAB_COVERAGE = 0.18
MIN_DECISION_PROBABILITY = 0.72
MIN_DECISION_MARGIN = 0.18
ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT_DIR / "backend" / "models" / "naive_bayes_model.json"
STOP_WORDS = {
    "the", "and", "for", "that", "this", "with", "from", "are", "was", "were",
    "will", "have", "has", "about", "into", "over", "after", "before", "their",
    "they", "you", "your", "our", "but", "not", "all", "can", "could", "would",
    "there", "what", "when", "where", "which", "while", "than", "then", "also",
}


def build_review_result(model, probabilities, reason, top_evidence=None):
    output_probabilities = {label: round(probabilities.get(label, 0) * 100, 2) for label in model["labels"]}
    output_probabilities["Needs Review"] = max(55, round(100 - max(output_probabilities.values() or [0])))
    return {
        "label": "Needs Review",
        "confidence": 55,
        "probabilities": output_probabilities,
        "topEvidence": top_evidence or [],
        "warning": reason,
        "model": model.get("algorithm", "Multinomial Naive Bayes"),
        "accuracy": round(model.get("training_report", {}).get("accuracy", 0) * 100, 2),
    }


def clean_text(value):
    value = str(value or "").lower()
    value = re.sub(r"https?://\S+", " ", value)
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def tokenize(value):
    cleaned = clean_text(value)
    words = cleaned.split()
    useful_words = [word for word in words if len(word) >= MIN_TOKEN_LENGTH and word not in STOP_WORDS]
    bigrams = [f"{useful_words[index]}_{useful_words[index + 1]}" for index in range(len(useful_words) - 1)]
    return useful_words + bigrams


def vectorize(text, vocabulary):
    vector = Counter()
    for token in tokenize(text):
        if token in vocabulary:
            vector[token] += 1
    return vector


def predict(model, text):
    vocabulary = model["vocabulary"]
    useful_unigrams = [token for token in tokenize(text) if "_" not in token]
    vector = vectorize(text, vocabulary)
    if not vector:
        neutral_probabilities = {label: 0.0 for label in model["labels"]}
        return build_review_result(model, neutral_probabilities, "Teksti nuk ka mjaft fjale te njohura per vendim te sigurt.")
    scores = {}
    evidence = {}
    for label in model["labels"]:
        score = model["priors"][label]
        likelihoods = model["likelihoods"][label]
        fallback = model["unknown_likelihoods"][label]
        token_evidence = []
        for token, count in vector.items():
            contribution = likelihoods.get(token, fallback) * count
            score += contribution
            token_evidence.append((token, contribution))
        scores[label] = score
        evidence[label] = sorted(token_evidence, key=lambda item: item[1], reverse=True)[:8]
    max_score = max(scores.values())
    exp_scores = {label: math.exp(score - max_score) for label, score in scores.items()}
    total_exp = sum(exp_scores.values()) or 1.0
    probabilities = {label: exp_scores[label] / total_exp for label in exp_scores}
    ranked_labels = sorted(probabilities.items(), key=lambda item: item[1], reverse=True)
    best_label = ranked_labels[0][0]
    second_probability = ranked_labels[1][1] if len(ranked_labels) > 1 else 0.0
    decision_margin = probabilities[best_label] - second_probability
    known_unigrams = sum(count for token, count in vector.items() if "_" not in token)
    vocab_coverage = known_unigrams / max(len(useful_unigrams), 1)
    top_evidence = [{"token": token, "score": round(score, 4)} for token, score in evidence[best_label]]
    if len(useful_unigrams) < MIN_ORIGINAL_WORDS:
        return build_review_result(model, probabilities, "Teksti eshte shume i shkurter; duhen me shume fjali nga artikulli.", top_evidence)
    if known_unigrams < MIN_KNOWN_UNIGRAMS or vocab_coverage < MIN_VOCAB_COVERAGE:
        return build_review_result(model, probabilities, "Modeli nuk gjeti mjaft fjale te njohura nga trajnimi per vendim te sigurt.", top_evidence)
    if probabilities[best_label] < MIN_DECISION_PROBABILITY or decision_margin < MIN_DECISION_MARGIN:
        return build_review_result(model, probabilities, "Probabilitetet jane te perziera; lajmi duhet verifikuar manualisht.", top_evidence)
    return {
        "label": best_label,
        "confidence": round(probabilities[best_label] * 100),
        "probabilities": {label: round(value * 100, 2) for label, value in probabilities.items()},
        "topEvidence": top_evidence,
        "model": model.get("algorithm", "Multinomial Naive Bayes"),
        "accuracy": round(model.get("training_report", {}).get("accuracy", 0) * 100, 2),
    }


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    text = f"{payload.get('headline', '')} {payload.get('text', '')}"
    model = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    print(json.dumps(predict(model, text)))


if __name__ == "__main__":
    main()
