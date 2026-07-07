from __future__ import annotations

import json

from shared import (
    DATASET_EXPECTATIONS,
    DatasetBundle,
    build_title_from_text,
    normalize_common_record,
    read_jsonl_rows,
    summarize_dataset,
    write_csv_rows,
)

DATASET_NAME = "fever"
DATASET_TYPE = "claim_verification"
FEVER_LABELS = {
    "SUPPORTS": "REAL",
    "REFUTES": "FAKE",
    "NOT ENOUGH INFO": "UNCERTAIN",
    "NEI": "UNCERTAIN",
}


def extract_evidence_source(row: dict) -> str:
    candidates = [
        row.get("page_title"),
        row.get("title"),
        row.get("source"),
        row.get("wiki_page"),
    ]

    evidence = row.get("evidence")

    if isinstance(evidence, list):
        for group in evidence:
            if isinstance(group, list):
                for item in group:
                    if isinstance(item, list) and len(item) >= 3 and isinstance(item[2], str):
                        candidates.append(item[2])
                    elif isinstance(item, dict):
                        candidates.append(item.get("page") or item.get("title"))
            elif isinstance(group, dict):
                candidates.append(group.get("page") or group.get("title"))

    for value in candidates:
        if value:
            return f"FEVER | {str(value).strip()}"

    return "FEVER"


def load_dataset() -> DatasetBundle:
    spec = DATASET_EXPECTATIONS[DATASET_NAME]
    candidate_files = [path for path in spec["files"] if path.exists()]

    if not candidate_files:
        fallback_candidates = [
            DATASET_EXPECTATIONS[DATASET_NAME]["files"][0].with_name("train.jsonl"),
            DATASET_EXPECTATIONS[DATASET_NAME]["files"][1].with_name("dev.jsonl"),
        ]
        candidate_files = [path for path in fallback_candidates if path.exists()]

    if not candidate_files:
        raise FileNotFoundError(
            "No FEVER JSONL files were found. Place `fever-train.jsonl` and `fever-dev.jsonl` in ml/datasets/raw/fever/."
        )

    records: list[dict[str, str]] = []
    raw_row_count = 0

    for dataset_path in candidate_files:
        rows = read_jsonl_rows(dataset_path)
        raw_row_count += len(rows)

        for row in rows:
            mapped_label = FEVER_LABELS.get(str(row.get("label", "")).strip().upper())

            if not mapped_label:
                continue

            claim = str(row.get("claim", "")).strip()

            records.append(
                normalize_common_record(
                    text=claim,
                    title=build_title_from_text(claim, limit=100),
                    label=mapped_label,
                    source=extract_evidence_source(row),
                    dataset_type=DATASET_TYPE,
                )
            )

    return DatasetBundle(
        dataset_name=DATASET_NAME,
        dataset_type=DATASET_TYPE,
        source_files=candidate_files,
        records=records,
        raw_row_count=raw_row_count,
        notes=["SUPPORTS -> REAL, REFUTES -> FAKE, and NOT ENOUGH INFO/NEI -> UNCERTAIN."],
    )


def export_processed_dataset() -> dict[str, object]:
    bundle = load_dataset()
    processed_file = DATASET_EXPECTATIONS[DATASET_NAME]["processed_file"]
    cleaned_records, report = summarize_dataset(
        dataset_name=bundle.dataset_name,
        dataset_type=bundle.dataset_type,
        records=bundle.records,
        raw_row_count=bundle.raw_row_count,
        source_files=bundle.source_files,
        processed_file=processed_file,
        notes=bundle.notes,
    )
    write_csv_rows(processed_file, cleaned_records)
    return report


def main() -> None:
    print(json.dumps(export_processed_dataset()))


if __name__ == "__main__":
    main()
