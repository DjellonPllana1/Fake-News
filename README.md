# Fake News Detection App

This project is a React + Vite dashboard for fake news classification, backed by a local Express API, MySQL, and a Python Multinomial Naive Bayes model trained from the news dataset.

## Features

- React frontend with charts, history, and analysis UI
- Express backend with `/api/analyze`, `/api/fetch-url`, `/api/history`, `/api/dashboard`, and `/api/articles`
- Login page separated from the protected dashboard pages
- MySQL support through `mysql2`, with JSON fallback for quick local demos
- Python Naive Bayes training pipeline in `ml/train_naive_bayes.py`
- Online article extraction by URL before ML prediction
- Local JSON database persisted in `backend/database.json`
- Database seed script that imports rows from the CSV dataset files
- Vite proxy set up so requests to `/api` go to the backend
- One command to run both backend and frontend together

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the app in development mode:

```bash
npm run dev
```

3. Open the frontend at `http://localhost:5173`

The backend runs on `http://localhost:4000` and is proxied by Vite.

## Train the Naive Bayes model

Run:

```bash
npm run train:nb
```

This trains `backend/models/naive_bayes_model.json` and writes metrics to `backend/models/training_report.json`.

## Seed the database

If you want to rebuild the database from the extracted dataset files, run:

```bash
npm run seed
```

By default the seed script reads:

- `C:/tmp/fake-news-seed-true/True.csv`
- `C:/tmp/fake-news-seed-fake/Fake.csv`

You can also pass custom CSV paths:

```bash
node backend/seed-database.js "C:/path/True.csv" "C:/path/Fake.csv"
```

## MySQL setup

1. Create the database and tables in MySQL:

```bash
mysql -u root -p < backend/schema.sql
```

2. Copy `.env.example` to `.env` and update the MySQL password/user if needed.

3. Seed MySQL from the generated JSON database:

```bash
npm run seed:mysql
```

4. Start the backend with MySQL enabled:

```bash
$env:DB_CLIENT="mysql"; npm run dev
```

Demo login:

- Email: `dion@demo.com`
- Password: `password123`

## Available scripts

- `npm run dev` - start the backend and frontend together
- `npm run seed` - rebuild `backend/database.json` from CSV files
- `npm run seed:mysql` - import `backend/database.json` into MySQL
- `npm run train:nb` - train the Python Multinomial Naive Bayes model
- `npm run backend` - start only the Express backend
- `npm run build` - build the Vite frontend for production
- `npm run preview` - preview the production build locally

## Notes

- The main classifier is now Python Multinomial Naive Bayes.
- The app can fetch article text from a URL, then classify it as Real, Fake, Satire, or Bias.
- Saved analysis results are stored in MySQL when `DB_CLIENT=mysql`.
