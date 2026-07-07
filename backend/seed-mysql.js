import { readFile } from "fs/promises";
import mysql from "mysql2/promise";
import "./env.js";

const databasePath = process.argv[2] || "backend/database.json";
const database = JSON.parse(await readFile(databasePath, "utf8"));

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fake_news_ui",
  multipleStatements: true,
});

await connection.beginTransaction();

try {
  for (const article of database.articles) {
    await connection.execute(
      `INSERT INTO articles (id, title, text, subject, source, label, published_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = ?,
         text = ?,
         subject = ?,
         source = ?,
         label = ?,
         published_date = ?`,
      [
        article.id,
        article.title,
        article.text,
        article.subject,
        article.source,
        article.label,
        article.date || null,
        article.title,
        article.text,
        article.subject,
        article.source,
        article.label,
        article.date || null,
      ],
    );
  }

  for (const item of database.analyses) {
    await connection.execute(
      `INSERT INTO analyses (id, title, source, url, label, confidence, model, risk_level, analyzed_at, language, article_id, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = ?,
         source = ?,
         url = ?,
         label = ?,
         confidence = ?,
         model = ?,
         risk_level = ?,
         analyzed_at = ?,
         language = ?,
         article_id = ?,
         details_json = ?`,
      [
        item.id,
        item.title,
        item.source,
        item.url || null,
        item.label,
        item.confidence,
        item.model,
        item.riskLevel || item.risk_level || "MEDIUM",
        new Date(item.date.replace(" ", "T")),
        item.language || "English",
        item.articleId || null,
        JSON.stringify({
          confidenceScore: item.confidenceScore ?? item.confidence / 100,
          explanation: item.explanation || "",
          summary: item.summary || "",
          keywords: item.keywords || [],
          probabilities: item.probabilities || null,
          warning: item.warning || "",
          textPreview: item.textPreview || "",
        }),
        item.title,
        item.source,
        item.url || null,
        item.label,
        item.confidence,
        item.model,
        item.riskLevel || item.risk_level || "MEDIUM",
        new Date(item.date.replace(" ", "T")),
        item.language || "English",
        item.articleId || null,
        JSON.stringify({
          confidenceScore: item.confidenceScore ?? item.confidence / 100,
          explanation: item.explanation || "",
          summary: item.summary || "",
          keywords: item.keywords || [],
          probabilities: item.probabilities || null,
          warning: item.warning || "",
          textPreview: item.textPreview || "",
        }),
      ],
    );
  }

  await connection.commit();
  console.log(`Seeded ${database.articles.length} articles and ${database.analyses.length} analyses into MySQL.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
