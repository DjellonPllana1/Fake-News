Place supported raw datasets in these exact folders and file names before merging or training:

- `ml/datasets/raw/kaggle/Fake.csv`
- `ml/datasets/raw/kaggle/True.csv`
- `ml/datasets/raw/liar/train.tsv`
- `ml/datasets/raw/liar/valid.tsv`
- `ml/datasets/raw/liar/test.tsv`
- `ml/datasets/raw/fever/fever-train.jsonl`
- `ml/datasets/raw/fever/fever-dev.jsonl`

The merge script will normalize each dataset into the shared format:

- `text`
- `title`
- `label`
- `source`
- `dataset_type`

Processed outputs are written to `ml/datasets/processed/`, the merged dataset goes to `ml/datasets/processed/final_dataset.csv`, and validation is written to `ml/metrics/dataset_report.json`.
