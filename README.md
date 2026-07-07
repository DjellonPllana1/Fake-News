# Verity Lens

Verity Lens is a production-style AI fake news detection platform built with React, Vite, Express, and Python machine learning. It does not stop at `REAL` or `FAKE`: every analysis produces explainable evidence, a configurable Trust Score, and an `UNCERTAIN` outcome when the signal is too weak for a responsible claim.

## Features

- Evidence verification system with:
  - title extraction
  - main-claim extraction
  - trusted-source search
  - semantic similarity scoring
  - support vs contradiction counts
  - evidence confidence
  - evidence-adjusted credibility stage
- Explainable article analysis with:
  - prediction
  - confidence score
  - final Trust Score (0-100)
  - trust level and explanation
  - final probability distribution
  - raw ML probability distribution
  - influential keywords
  - suspicious sentences
  - recommendation
  - article summary
  - sentiment analysis
  - named entity extraction
  - keyword extraction
- Rule-based credibility engine for:
  - clickbait title
  - excessive capitalization
  - excessive punctuation
  - emotional language
  - sensational phrases
  - suspicious domains
  - article length
  - missing author
  - missing publication date
- Configurable trust-scoring engine that combines:
  - machine learning probability
  - clickbait detection
  - domain reputation
  - writing quality
  - sensational language
  - emotional language
  - author presence
  - publication date
  - article length
  - source reliability
- Source reputation module with:
  - local JSON domain registry
  - trusted, medium, suspicious, and unknown badges
  - domain trust score
  - political bias
  - country
  - reliability
  - fact-checking history
- TF-IDF pipeline with lowercase normalization, URL removal, punctuation cleanup, stopword removal, and stemming
- Professional dataset pipeline with raw, processed, model, and metrics directories under `ml/`
- Multi-dataset hybrid training support for:
  - Kaggle Fake and Real News Dataset
  - LIAR Dataset
  - FEVER-style claim verification data
- Model training and comparison across:
  - Multinomial Naive Bayes
  - Logistic Regression
  - Linear SVM
- Automatic best-model selection and saved artifact/version metadata
- Configurable `UNCERTAIN` threshold through `.env`
- Searchable history with PDF, CSV, and JSON export
- Executive dashboard analytics with live statistics, animated counters, prediction mix, confidence distribution, timelines, model comparison, suspicious keywords, domain analytics, entity trends, weekly/monthly rollups, recent activity, model version, and system status
- System diagnostics page and health endpoint
- MySQL primary database with optional JSON fallback
- Retrain model button from the UI

## Architecture

```text
backend/
  controllers/
  middleware/
  routes/
  services/
  utils/
ml/
src/
```

### Backend modules

- `backend/services/modelService.js`
  Runs Python inference/training and exposes model metrics and health data.
- `backend/services/textIntelligenceService.js`
  Builds explainability, rule findings, suspicious sentence detection, sentiment, entities, and the base credibility stage before final trust scoring.
- `backend/services/evidenceVerificationService.js`
  Extracts claims, queries trusted evidence providers, scores supporting vs contradicting articles, and adjusts the evidence-based credibility stage.
- `backend/services/trustScoreService.js`
  Combines ML, rule, metadata, domain, and evidence reliability signals into the final configurable Trust Score with explanations.
- `backend/services/sourceReputationService.js`
  Loads the JSON source registry, matches domains and subdomains, and returns badge-ready reputation metadata for analysis and URL preview flows.
- `backend/services/analysisService.js`
  Orchestrates fetch, prediction, explainability, and history persistence.
- `backend/services/exportService.js`
  Generates CSV, JSON, and branded PDF exports.
- `backend/services/diagnosticsService.js`
  Collects runtime, configuration, storage, and model diagnostics.

## API Endpoints

- `POST /api/login`
- `POST /api/analyze`
- `POST /api/fetch-url`
- `GET /api/history`
- `GET /api/history/export.csv`
- `GET /api/history/export.json`
- `GET /api/history/export.pdf`
- `GET /api/history/:analysisId/export.csv`
- `GET /api/history/:analysisId/export.json`
- `GET /api/history/:analysisId/export.pdf`
- `GET /api/dashboard`
- `GET /api/model-metrics`
- `POST /api/model/retrain`
- `GET /api/health`
- `GET /api/system-diagnostics`

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and adjust values if needed.

```env
DB_ENABLED=true
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=fake_news_ai
PORT=4000
CONFIDENCE_THRESHOLD=0.72
ML_WEIGHT=0.68
RULE_WEIGHT=0.32
FETCH_TIMEOUT_MS=15000
EVIDENCE_PROVIDERS=local_trusted_corpus
EVIDENCE_MATCH_THRESHOLD=0.16
EVIDENCE_PROVIDER_LIMIT=8
TRUST_WEIGHT_ML_PROBABILITY=1.6
TRUST_WEIGHT_CLICKBAIT_DETECTION=0.9
TRUST_WEIGHT_DOMAIN_REPUTATION=1.1
TRUST_WEIGHT_WRITING_QUALITY=1.0
TRUST_WEIGHT_SENSATIONAL_LANGUAGE=1.0
TRUST_WEIGHT_EMOTIONAL_LANGUAGE=0.7
TRUST_WEIGHT_AUTHOR_PRESENCE=0.5
TRUST_WEIGHT_PUBLICATION_DATE=0.5
TRUST_WEIGHT_ARTICLE_LENGTH=0.6
TRUST_WEIGHT_SOURCE_RELIABILITY=1.2
TRUST_SCORE_HIGH_THRESHOLD=75
TRUST_SCORE_MEDIUM_THRESHOLD=55
```

`DB_ENABLED=true` is the primary production-style path and uses MySQL through `mysql2/promise`.
Set `DB_ENABLED=false` only when you intentionally want the legacy local JSON fallback at `backend/database.json`.

### 3. Initialize MySQL

Start MySQL locally, then run:

```bash
npm run db:setup
```

This command runs:

```bash
npm run db:migrate
npm run db:seed
```

The migration creates these application tables:

- `users`
- `analyses`
- `history`
- `model_metrics`
- `api_logs`
- `training_jobs`
- `system_events`
- `articles`
- `notifications`

The seed command creates an admin account, a demo account, imports existing dataset articles from `backend/database.json`, and loads sample analyses.

Default seeded credentials:

```text
admin@demo.com / password123
demo@demo.com / password123
```

To verify MySQL is active:

```bash
npm run backend
```

Then open:

```text
http://127.0.0.1:4000/api/health
```

The JSON response should include `"database":"mysql"`.

### 4. Install Python dependencies

```bash
pip install -r requirements.txt
```

If you want to force a specific interpreter, set `PYTHON_BIN` in `.env`.

### 5. Add datasets

Verity Lens does not auto-download external datasets. Place the raw files in these exact locations:

- `ml/datasets/raw/kaggle/Fake.csv`
- `ml/datasets/raw/kaggle/True.csv`
- `ml/datasets/raw/liar/train.tsv`
- `ml/datasets/raw/liar/valid.tsv`
- `ml/datasets/raw/liar/test.tsv`
- `ml/datasets/raw/fever/fever-train.jsonl`
- `ml/datasets/raw/fever/fever-dev.jsonl`

Recommended download locations:

- Kaggle Fake and Real News Dataset:
  [Kaggle Fake and Real News Dataset](https://www.kaggle.com/datasets/clmentbisaillon/fake-and-real-news-dataset)
- LIAR Dataset:
  [LIAR Dataset](https://www.cs.ucsb.edu/~william/data/liar_dataset.zip)
- FEVER Dataset:
  [FEVER Dataset](https://fever.ai/dataset/fever.html)

### 6. Normalize and merge datasets

```bash
npm run merge:datasets
```

This step:

- loads every available supported dataset
- normalizes rows into `text,title,label,source,dataset_type`
- validates required columns, empty text, duplicates, label balance, dataset size, and language hints
- writes `ml/metrics/dataset_report.json`
- writes `ml/datasets/processed/final_dataset.csv`

### 7. Train the models

```bash
npm run train:models
```

Generated artifacts:

- `ml/models/best_model.pkl`
- `ml/models/vectorizer.pkl`
- `ml/models/label_mapping.json`
- `ml/models/model_card.json`
- `ml/metrics/metrics.json`
- `ml/metrics/dataset_report.json`

Compatibility copies are also written to:

- `backend/models/best_model.joblib`
- `backend/models/model_metrics.json`
- `backend/models/training_report.json`

### 8. Start the platform

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Production Deployment

Production deployment assets are included in the repository:

- `Dockerfile.backend`
- `Dockerfile.frontend`
- `docker-compose.yml`
- `nginx/default.conf`
- `.env.production.example`
- `.github/workflows/ci.yml`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment guide.

## Demo Login

- Admin: `admin@demo.com` / `password123`
- Demo analyst: `demo@demo.com` / `password123`
- Existing imported demo users, such as `dion@demo.com`, also keep `password123`.

## Commands

- `npm run dev`
- `npm run backend`
- `npm run build`
- `npm run lint`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:setup`
- `npm run seed`
- `npm run seed:mysql`
- `npm run merge:datasets`
- `npm run train:models`
- `npm run evaluate:models`
- `npm run train:nb`
- `npm run docker:build`
- `npm run docker:up`
- `npm run docker:down`
- `npm run docker:logs`

## Training and Evaluation

### Merge and validate datasets

```bash
npm run merge:datasets
```

### Train and save the best model

```bash
npm run train:models
```

### Evaluate all models without overwriting the saved artifact

```bash
npm run evaluate:models
```

### Test prediction from the command line

PowerShell example:

```powershell
'{"headline":"Breaking report","text":"Officials confirmed a new policy update after a public briefing.","confidence_threshold":0.72}' | node ml/run-python.js ml/predict.py
```

### Legacy compatibility alias

```bash
npm run train:nb
```

## How the final score works

1. The best trained TF-IDF model produces a `REAL` vs `FAKE` probability.
2. The source reputation module enriches the article with domain trust score, bias, country, reliability, fact-checking history, and a visual badge.
3. The rule-based credibility engine scores metadata and language risks.
4. The evidence verification engine extracts the main claims and searches a trusted-source provider for similar reporting.
5. Supporting and contradicting evidence is turned into an evidence confidence score.
6. An evidence-adjusted credibility score is derived from the base language score plus claim-verification support.
7. The Trust Score engine then combines ML probability, clickbait risk, domain reputation, writing quality, sensational/emotional language, author presence, publication date, article length, and source reliability using configurable weights.
8. If the final confidence stays below `CONFIDENCE_THRESHOLD`, the label becomes `UNCERTAIN`.

## Extending the Source Reputation Registry

Add or update entries in `backend/data/source-reputation.json`.

Each entry supports:

- `domain`
- `aliases`
- `badge`
- `trustScore`
- `politicalBias`
- `country`
- `reliability`
- `factCheckingHistory`

Subdomains are matched automatically, so adding `reuters.com` also covers `www.reuters.com` and section URLs beneath it.

## How to test features

### Login

1. Open the app.
2. Sign in with the demo account.

### Manual analysis

1. Open `Analyze Article`.
2. Paste article text and optional metadata.
3. Confirm the result shows prediction, confidence, Trust Score, trust level, trust explanation, trust reasons, weighted trust signals, probabilities, keywords, suspicious sentences, explanation, recommendation, summary, sentiment, entities, main claims, trusted sources, supporting count, contradicting count, similarity score, and evidence confidence.

### URL analysis

1. Open `URL Analyzer`.
2. Paste a direct article URL.
3. Click `Fetch Article`, then `Analyze URL`.
4. Confirm source metadata, preview summary, source reputation badge, domain, trust score, political bias, country, reliability, fact-checking history, and the full explainable result.

### Searchable history

1. Open `History`.
2. Search by title, source, summary, or extracted entities.
3. Filter by label and confirm Trust Score fields appear on saved items.

### CSV export

1. Open `History`.
2. Click `Export CSV`.
3. Confirm a CSV download starts and includes Trust Score, Trust Level, keywords, evidence fields, and model metadata columns.

### JSON export

1. Open `History`.
2. Click `Export JSON` for the filtered history report or a single analysis card.
3. Confirm the JSON file includes report metadata, analysis or history payloads, chart-ready data, and system information.

### PDF export

1. Open `History`.
2. Click `Export PDF` for the filtered history report.
3. Click `Export PDF` on a single history card for an article report and confirm the PDF includes article text, prediction, confidence, Trust Score, evidence, keywords, entities, summary, charts, date, model version, and system information.

### Production stack

1. Copy `.env.production.example` to `.env.production`.
2. Start the stack with `docker compose --env-file .env.production up -d --build`.
3. Open `http://localhost:8080`.
4. Confirm `http://localhost:8080/healthz` returns `ok`.
5. Confirm `http://localhost:8080/api/health` returns a healthy JSON response.

### Dashboard

1. Open `Dashboard`.
2. Confirm the executive dashboard shows live KPI counters, system status, model version, recent activity, prediction timeline, confidence distribution, model comparison, top suspicious keywords, most analyzed domains, most common entities, weekly statistics, monthly statistics, and recent analyses.

### Model metrics and retraining

1. Open `Model Metrics`.
2. Review accuracy, precision, recall, F1, confusion matrices, preprocessing, and version.
3. Click `Retrain Models`.

### Health endpoint

```bash
curl http://localhost:4000/api/health
```

### System diagnostics

1. Open `System Diagnostics`.
2. Confirm runtime, configuration, storage, and model information are displayed.

## Notes

- The app keeps the JSON database workflow for easy local development.
- If Python inference is unavailable, the backend falls back to a lightweight heuristic analyzer instead of crashing.
- Suspicious sentence highlighting and rule findings are designed as analyst aids, not ground truth.
