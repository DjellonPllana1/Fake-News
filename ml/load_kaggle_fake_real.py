from __future__ import annotations

import json

from shared import (
    DATASET_EXPECTATIONS,
    DatasetBundle,
    normalize_common_record,
    read_csv_rows,
    summarize_dataset,
    write_csv_rows,
)

DATASET_NAME = "kaggle_fake_real"
DATASET_TYPE = "article"


def resolve_kaggle_files():
    spec = DATASET_EXPECTATIONS[DATASET_NAME]
    primary_fake_path, primary_real_path = spec["files"]
    fallback_fake_path, fallback_real_path = spec.get("fallback_files", [])
    fake_path = primary_fake_path if primary_fake_path.exists() else fallback_fake_path
    real_path = primary_real_path if primary_real_path.exists() else fallback_real_path

    if not fake_path.exists() or not real_path.exists():
        supported_locations = [
            primary_fake_path,
            primary_real_path,
            fallback_fake_path,
            fallback_real_path,
        ]
        raise FileNotFoundError(
            "Missing Kaggle Fake and Real News file(s). Supported locations: "
            + ", ".join(str(path) for path in supported_locations)
        )

    return fake_path, real_path


def load_dataset() -> DatasetBundle:
    spec = DATASET_EXPECTATIONS[DATASET_NAME]
    fake_path, real_path = resolve_kaggle_files()

    records: list[dict[str, str]] = []
    raw_row_count = 0

    for label, dataset_path in [("FAKE", fake_path), ("REAL", real_path)]:
        rows = read_csv_rows(dataset_path)
        raw_row_count += len(rows)

        if rows:
            required_columns = {"title", "text"}
            missing_columns = sorted(required_columns.difference(rows[0].keys()))

            if missing_columns:
                raise ValueError(f"{dataset_path.name} is missing required column(s): {', '.join(missing_columns)}.")

        for row in rows:
            source_parts = ["Kaggle Fake and Real News"]

            if row.get("subject"):
                source_parts.append(str(row["subject"]).strip())

            if row.get("date"):
                source_parts.append(str(row["date"]).strip())

            records.append(
                normalize_common_record(
                    text=row.get("text", ""),
                    title=row.get("title", ""),
                    label=label,
                    source=" | ".join(part for part in source_parts if part),
                    dataset_type=DATASET_TYPE,
                )
            )

    return DatasetBundle(
        dataset_name=DATASET_NAME,
        dataset_type=DATASET_TYPE,
        source_files=[fake_path, real_path],
        records=records,
        raw_row_count=raw_row_count,
        notes=[
            "Rows are derived from the Kaggle Fake.csv and True.csv article corpora.",
            f"Detected files: {fake_path} and {real_path}.",
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
