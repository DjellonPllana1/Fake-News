import fs from "fs/promises";
import path from "path";

process.env.DB_ENABLED = "false";

const { createEmptyDatabase, writeDatabase } = await import("./database.js");

const trueCsvPath = process.argv[2] || "C:/tmp/fake-news-seed-true/True.csv";
const fakeCsvPath = process.argv[3] || "C:/tmp/fake-news-seed-fake/Fake.csv";
const perClassLimit = Number(process.env.SEED_LIMIT || 700);

function parseCsv(content) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeDate(value, fallbackIndex) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().slice(0, 10);
  }

  const fallback = new Date(Date.UTC(2017, 0, 1 + (fallbackIndex % 365)));
  return fallback.toISOString().slice(0, 10);
}

async function loadArticles(csvPath, label, prefix) {
  const content = await fs.readFile(csvPath, "utf8");
  const [header, ...records] = parseCsv(content);
  const columns = Object.fromEntries(header.map((name, index) => [name.trim().toLowerCase(), index]));

  return records
    .filter((record) => record.length >= 4)
    .slice(0, perClassLimit)
    .map((record, index) => ({
      id: `${prefix}-${String(index + 1).padStart(5, "0")}`,
      title: (record[columns.title] || "Untitled article").trim(),
      text: (record[columns.text] || "").trim(),
      subject: (record[columns.subject] || "General").trim(),
      source: label === "REAL" ? "Reuters dataset" : "FakeNewsNet dataset",
      label,
      date: normalizeDate(record[columns.date] || "", index),
    }));
}

const truePath = path.resolve(trueCsvPath);
const fakePath = path.resolve(fakeCsvPath);

const [realArticles, fakeArticles] = await Promise.all([
  loadArticles(truePath, "REAL", "REAL"),
  loadArticles(fakePath, "FAKE", "FAKE"),
]);

const database = createEmptyDatabase();
database.meta.seededAt = new Date().toISOString();
database.meta.sourceFiles = [truePath, fakePath];
database.articles = [...realArticles, ...fakeArticles].sort((a, b) => b.date.localeCompare(a.date));
database.analyses = database.articles.slice(0, 25).map((article, index) => ({
  id: `AN-${String(index + 1).padStart(4, "0")}`,
  title: article.title,
  source: article.source,
  label: article.label,
  confidence: article.label === "REAL" ? 91 : 94,
  confidenceScore: article.label === "REAL" ? 0.91 : 0.94,
  model: "Seeded Historical Record",
  date: `${article.date} 09:${String(index % 60).padStart(2, "0")}`,
  language: "English",
  articleId: article.id,
  riskLevel: article.label === "REAL" ? "LOW" : "HIGH",
  summary: article.text.slice(0, 220),
  explanation: article.label === "REAL" ? "Seeded as a baseline real article record." : "Seeded as a baseline fake article record.",
  keywords: article.title.toLowerCase().split(/\s+/).filter((token) => token.length > 4).slice(0, 6),
  probabilities: article.label === "REAL" ? { REAL: 0.91, FAKE: 0.09 } : { FAKE: 0.94, REAL: 0.06 },
  textPreview: article.text.slice(0, 300),
}));

await writeDatabase(database);

console.log(`Seeded ${database.articles.length} articles into backend/database.json`);
