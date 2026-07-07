from __future__ import annotations

import csv
import json

from shared import (
    DATASET_EXPECTATIONS,
    DatasetBundle,
    build_title_from_text,
    normalize_common_record,
    summarize_dataset,
    write_csv_rows,
)

DATASET_NAME = "liar"
DATASET_TYPE = "claim"
LIAR_COLUMNS = [
    "id",
    "label",
    "statement",
    "subjects",
    "speaker",
    "speaker_job_title",
    "state_info",
    "party_affiliation",
    "barely_true_counts",
    "false_counts",
    "half_true_counts",
    "mostly_true_counts",
    "pants_on_fire_counts",
    "context",
]
LIAR_LABELS = {
    "true": "REAL",
    "mostly-true": "REAL",
    "false": "FAKE",
    "pants-fire": "FAKE",
    "half-true": "UNCERTAIN",
    "barely-true": "UNCERTAIN",
    "mostly false": "FAKE",
}


def read_liar_rows(dataset_path):
    with dataset_path.open("r", encoding="utf-8-sig", newline="") as handle:
        peek = handle.readline()
        handle.seek(0)

        if "statement" in peek.lower() and "label" in peek.lower():
            reader = csv.DictReader(handle, delimiter="\t")
            return [{key: str(value or "") for key, value in row.items()} for row in reader]

        reader = csv.reader(handle, delimiter="\t")
        rows = []

        for row in reader:
            if not row:
                continue

            values = row + [""] * max(0, len(LIAR_COLUMNS) - len(row))
            rows.append(dict(zip(LIAR_COLUMNS, values)))

        return rows


def load_dataset() -> DatasetBundle:
    spec = DATASET_EXPECTATIONS[DATASET_NAME]
    source_files = [path for path in spec["files"] if path.exists()]

    if not source_files:
        raise FileNotFoundError(
            "No LIAR TSV files were found. Place `train.tsv`, `valid.tsv`, and `test.tsv` in ml/datasets/raw/liar/."
        )

    records: list[dict[str, str]] = []
    raw_row_count = 0

    for dataset_path in source_files:
        rows = read_liar_rows(dataset_path)
        raw_row_count += len(rows)

        for row in rows:
            mapped_label = LIAR_LABELS.get(str(row.get("label", "")).strip().lower())

            if not mapped_label:
                continue

            statement = str(row.get("statement", "")).strip()
            speaker = str(row.get("speaker", "")).strip()
            party = str(row.get("party_affiliation", "")).strip()
            context = str(row.get("context", "")).strip()
            source_bits = ["LIAR Dataset"]

            if speaker:
                source_bits.append(speaker)

            if party:
                source_bits.append(party)

            if context:
                source_bits.append(context)

            records.append(
                normalize_common_record(
                    text=statement,
                    title=build_title_from_text(statement, limit=96),
                    label=mapped_label,
                    source=" | ".join(bit for bit in source_bits if bit),
                    dataset_type=DATASET_TYPE,
                )
            )

    return DatasetBundle(
        dataset_name=DATASET_NAME,
        dataset_type=DATASET_TYPE,
        source_files=source_files,
        records=records,
        raw_row_count=raw_row_count,
        notes=[
            "Labels are normalized as true/mostly-true -> REAL, false/pants-fire -> FAKE, and half-true/barely-true -> UNCERTAIN."
        ],
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
