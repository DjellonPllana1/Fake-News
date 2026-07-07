from __future__ import annotations

import argparse
import json
import sys

from load_fever import load_dataset as load_fever_dataset
from load_kaggle_fake_real import load_dataset as load_kaggle_dataset
from load_liar import load_dataset as load_liar_dataset
from shared import (
    DATASET_EXPECTATIONS,
    DATASET_REPORT_PATH,
    FINAL_DATASET_PATH,
    dataset_distribution,
    dataset_type_distribution,
    ensure_directories,
    now_utc_iso,
    relative_to_root,
    summarize_dataset,
    write_csv_rows,
    write_json,
    build_missing_dataset_report,
)

LOADERS = {
    "kaggle_fake_real": load_kaggle_dataset,
    "liar": load_liar_dataset,
    "fever": load_fever_dataset,
}


def merge_available_datasets() -> dict[str, object]:
    ensure_directories()
    generated_at = now_utc_iso()
    dataset_reports: dict[str, object] = {}
    found_datasets: list[dict[str, object]] = []
    merged_records: list[dict[str, str]] = []
    available_datasets: list[str] = []
    source_files = []
    raw_row_count = 0

    for dataset_name, loader in LOADERS.items():
        try:
            bundle = loader()
        except FileNotFoundError:
            dataset_reports[dataset_name] = build_missing_dataset_report(dataset_name)
            continue

        processed_file = DATASET_EXPECTATIONS[dataset_name]["processed_file"]
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
        dataset_reports[dataset_name] = report
        available_datasets.append(dataset_name)
        found_datasets.append(
            {
                "dataset_name": dataset_name,
                "source_files": [relative_to_root(path) for path in bundle.source_files],
                "raw_rows_loaded": bundle.raw_row_count,
                "rows_after_cleaning": len(cleaned_records),
            }
        )
        merged_records.extend(cleaned_records)
        raw_row_count += bundle.raw_row_count
        source_files.extend(bundle.source_files)

    if not merged_records:
        report = {
            "generated_at": generated_at,
            "status": "missing_datasets",
            "message": "No supported dataset files were found. Add at least one dataset to ml/datasets/raw before training.",
            "expected_datasets": {
                name: {
                    "description": spec["description"],
                    "source_url": spec["source_url"],
                    "expected_files": [relative_to_root(path) for path in spec["files"]],
                }
                for name, spec in DATASET_EXPECTATIONS.items()
            },
            "datasets": dataset_reports,
            "found_datasets": found_datasets,
            "final_dataset": None,
        }
        write_json(DATASET_REPORT_PATH, report)
        raise RuntimeError(report["message"])

    final_records, final_report = summarize_dataset(
        dataset_name="final_dataset",
        dataset_type="hybrid",
        records=merged_records,
        raw_row_count=raw_row_count,
        source_files=source_files,
        processed_file=FINAL_DATASET_PATH,
        notes=[
            "This merged dataset combines article-level and claim-level sources for a hybrid training strategy.",
            f"Datasets included: {', '.join(available_datasets)}.",
        ],
    )
    write_csv_rows(FINAL_DATASET_PATH, final_records)

    payload = {
        "generated_at": generated_at,
        "status": "ready",
        "available_datasets": available_datasets,
        "missing_datasets": sorted(set(LOADERS).difference(available_datasets)),
        "found_datasets": found_datasets,
        "expected_datasets": {
            name: {
                "description": spec["description"],
                "source_url": spec["source_url"],
                "expected_files": [relative_to_root(path) for path in spec["files"]]
                + [relative_to_root(path) for path in spec.get("fallback_files", [])],
                "processed_file": relative_to_root(spec["processed_file"]),
            }
            for name, spec in DATASET_EXPECTATIONS.items()
        },
        "datasets": dataset_reports,
        "final_dataset": {
            **final_report,
            "label_distribution": dataset_distribution(final_records),
            "dataset_type_distribution": dataset_type_distribution(final_records),
            "output_file": relative_to_root(FINAL_DATASET_PATH),
        },
    }
    write_json(DATASET_REPORT_PATH, payload)
    return payload


def print_found_dataset_summary(payload: dict[str, object]) -> None:
    found_datasets = payload.get("found_datasets", [])

    if not found_datasets:
        print("Found datasets: none", file=sys.stderr)
        return

    print("Found datasets:", file=sys.stderr)

    for item in found_datasets:
        print(
            f"- {item['dataset_name']}: loaded {item['raw_rows_loaded']} raw row(s), kept {item['rows_after_cleaning']} row(s) after cleaning, files={', '.join(item['source_files'])}",
            file=sys.stderr,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize, validate, and merge supported fake-news datasets.")
    parser.parse_args()
    payload = merge_available_datasets()
    print_found_dataset_summary(payload)
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
