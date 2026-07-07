import { readFile } from "fs/promises";
import path from "path";
import { getDatabaseConfig, mysql } from "../config/database.js";
import { hashPassword } from "../utils/hash.js";

const databasePath = path.resolve(process.argv[2] || "backend/database.json");
const database = JSON.parse(await readFile(databasePath, "utf8"));
const connection = await mysql.createConnection(getDatabaseConfig());

const users = [
  { name: "Admin User", email: "admin@demo.com", passwordHash: hashPassword("password123"), role: "Admin", status: "Active" },
  { name: "Demo User", email: "demo@demo.com", passwordHash: hashPassword("password123"), role: "Analyst", status: "Active" },
  ...(database.users || []).map((user) => ({
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash || user.password_hash || hashPassword("password123"),
    role: user.role || "User",
    status: user.status || "Active",
  })),
];

function toMysqlDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function analysisDetails(item = {}) {
  const details = { ...item };
  delete details.id;
  delete details.title;
  delete details.source;
  delete details.url;
  delete details.label;
  delete details.prediction;
  delete details.confidence;
  delete details.model;
  delete details.riskLevel;
  delete details.date;
  delete details.language;
  delete details.articleId;
  return JSON.stringify(details);
}

await connection.beginTransaction();

try {
  for (const user of users) {
    await connection.execute(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         status = VALUES(status)`,
      [user.name, user.email, user.passwordHash, user.role, user.status]
    );
  }

  for (const article of database.articles || []) {
    await connection.execute(
      `INSERT INTO articles (id, title, text, subject, source, label, published_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         text = VALUES(text),
         subject = VALUES(subject),
         source = VALUES(source),
         label = VALUES(label),
         published_date = VALUES(published_date)`,
      [article.id, article.title, article.text, article.subject, article.source, article.label, article.date || null]
    );
  }

  const sampleAnalyses = (database.analyses || []).slice(0, Math.max(3, Number(process.env.SEED_ANALYSIS_LIMIT || 25)));

  for (const item of sampleAnalyses) {
    const analyzedAt = toMysqlDate(item.date) || new Date();
    await connection.execute(
      `INSERT INTO analyses (id, title, source, url, label, confidence, model, risk_level, analyzed_at, language, article_id, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         source = VALUES(source),
         url = VALUES(url),
         label = VALUES(label),
         confidence = VALUES(confidence),
         model = VALUES(model),
         risk_level = VALUES(risk_level),
         analyzed_at = VALUES(analyzed_at),
         language = VALUES(language),
         article_id = VALUES(article_id),
         details_json = VALUES(details_json)`,
      [
        item.id,
        item.title,
        item.source,
        item.url || null,
        item.label,
        Number(item.confidence || 0),
        item.model || "Seeded Historical Record",
        item.riskLevel || "MEDIUM",
        analyzedAt,
        item.language || "English",
        item.articleId || null,
        analysisDetails(item),
      ]
    );

    await connection.execute(
      `INSERT INTO history (analysis_id, event_type, title, label, confidence, occurred_at, payload_json)
       VALUES (?, 'seeded_analysis', ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`,
      [item.id, item.title, item.label, Number(item.confidence || 0), analyzedAt, JSON.stringify(item)]
    );
  }

  await connection.execute(
    `INSERT INTO notifications (title, message, time_label, unread)
     VALUES ('MySQL database ready', 'Seed data has been loaded into MySQL.', 'Just now', 1)`
  );

  await connection.commit();
  console.log(`Seeded ${users.length} users, ${(database.articles || []).length} articles, and ${sampleAnalyses.length} analyses into MySQL.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
