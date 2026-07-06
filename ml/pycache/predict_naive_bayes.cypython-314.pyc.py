import json
import math
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

RANDOM_SEED = 42
MIN_TOKEN_LENGTH = 3
MAX_VOCAB_SIZE = 18000
ALPHA = 1.0
ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT_DIR / "backend" / "database.json"
MODEL_PATH = ROOT_DIR / "backend" / "models" / "naive_bayes_model.json"
REPORT_PATH = ROOT_DIR / "backend" / "models" / "training_report.json"

STOP_WORDS = {
    "the", "and", "for", "that", "this", "with", "from", "are", "was", "were",
    "will", "have", "has", "about", "into", "over", "after", "before", "their",
    "they", "you", "your", "our", "but", "not", "all", "can", "could", "would",
    "there", "what", "when", "where", "which", "while", "than", "then", "also",
}

SYNTHETIC_EXAMPLES = [
    ("Satire", "Local mayor promises to replace all traffic lights with mood rings by Monday."),
    ("Satire", "Scientists announce that eating pizza backwards improves Wi-Fi signal strength."),
    ("Satire", "Parody report says parliament will debate whether clouds need parking permits."),
    ("Satire", "Comic news site claims national economy was fixed by a lucky sandwich."),
    ("Satire", "Joke article says robots formed a union to demand longer charging naps."),
    ("Bias", "Opinion: the policy proves one party cares about families while opponents ignore reality."),
    ("Bias", "Editorial argues the reform is obviously disastrous and only irresponsible leaders support it."),
    ("Bias", "Commentary claims critics are completely blind to the government's successful agenda."),
    ("Bias", "Perspective article praises the candidate and dismisses every opposing argument as nonsense."),
    ("Bias", "Opinion column frames the decision as a moral victory without presenting counter evidence."),
]


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


def load_dataset():
    database = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    examples = []
    for article in database.get("articles", []):
        label = article.get("label", "Real")
        title = article.get("title", "")
        body = article.get("text", "")
        subject = article.get("subject", "")
        combined = f"{title} {subject} {body}"
        if len(combined.strip()) > 80 and label in {"Real", "Fake"}:
            examples.append((label, combined))
    for label, text in SYNTHETIC_EXAMPLES:
        for number in range(30):
            examples.append((label, f"{text} Example variation {number}."))
    random.Random(RANDOM_SEED).shuffle(examples)
    return examples


def split_dataset(examples, test_ratio=0.2):
    split_index = int(len(examples) * (1 - test_ratio))
    train_examples = examples[:split_index]
    test_examples = examples[split_index:]
    return train_examples, test_examples


def build_vocabulary(train_examples):
    token_counts = Counter()
    for _label, text in train_examples:
        token_counts.update(tokenize(text))
    most_common = token_counts.most_common(MAX_VOCAB_SIZE)
    vocabulary = {token: index for index, (token, _count) in enumerate(most_common)}
    return vocabulary


def vectorize(text, vocabulary):
    vector = Counter()
    for token in tokenize(text):
        if token in vocabulary:
            vector[token] += 1
    return vector


def train_naive_bayes(train_examples, vocabulary):
    class_document_counts = Counter()
    class_token_counts = defaultdict(Counter)
    class_total_tokens = Counter()
    total_documents = len(train_examples)
    labels = sorted({label for label, _text in train_examples})
    for label, text in train_examples:
        class_document_counts[label] += 1
        vector = vectorize(text, vocabulary)
        class_token_counts[label].update(vector)
        class_total_tokens[label] += sum(vector.values())
    priors = {label: math.log(class_document_counts[label] / total_documents) for label in labels}
    vocabulary_size = len(vocabulary)
    likelihoods = {}
    unknown_likelihoods = {}
    for label in labels:
        denominator = class_total_tokens[label] + ALPHA * vocabulary_size
        unknown_likelihoods[label] = math.log(ALPHA / denominator)
        likelihoods[label] = {
            token: math.log((class_token_counts[label][token] + ALPHA) / denominator)
            for token in vocabulary
        }
    return {
        "algorithm": "Multinomial Naive Bayes",
        "labels": labels,
        "alpha": ALPHA,
        "vocabulary": vocabulary,
        "priors": priors,
        "likelihoods": likelihoods,
        "unknown_likelihoods": unknown_likelihoods,
        "class_document_counts": dict(class_document_counts),
    }


def predict_one(model, text):
    vocabulary = model["vocabulary"]
    vector = vectorize(text, vocabulary)
    scores = {}
    for label in model["labels"]:
        score = model["priors"][label]
        likelihoods = model["likelihoods"][label]
        fallback = model["unknown_likelihoods"][label]
        for token, count in vector.items():
            score += likelihoods.get(token, fallback) * count
        scores[label] = score
    best_label = max(scores, key=scores.get)
    max_score = max(scores.values())
    exp_scores = {label: math.exp(score - max_score) for label, score in scores.items()}
    total_exp = sum(exp_scores.values()) or 1.0
    probabilities = {label: exp_scores[label] / total_exp for label in exp_scores}
    return best_label, probabilities


def evaluate(model, test_examples):
    labels = model["labels"]
    confusion = {truth: {predicted: 0 for predicted in labels} for truth in labels}
    correct = 0
    for truth, text in test_examples:
        predicted, _probabilities = predict_one(model, text)
        confusion[truth][predicted] += 1
        if predicted == truth:
            correct += 1
    accuracy = correct / max(len(test_examples), 1)
    return {"accuracy": accuracy, "confusion_matrix": confusion, "test_size": len(test_examples)}


def main():
    examples = load_dataset()
    train_examples, test_examples = split_dataset(examples)
    vocabulary = build_vocabulary(train_examples)
    model = train_naive_bayes(train_examples, vocabulary)
    report = evaluate(model, test_examples)
    model["training_report"] = report
    model["train_size"] = len(train_examples)
    model["test_size"] = len(test_examples)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    MODEL_PATH.write_text(json.dumps(model), encoding="utf-8")
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"model": str(MODEL_PATH), **report}, indent=2))


if __name__ == "__main__":
    main()
