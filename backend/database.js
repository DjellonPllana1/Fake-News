import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import "./env.js";

export const databaseFile = path.resolve("backend", "database.json");
const useMysql = process.env.DB_CLIENT === "mysql";
let pool;

const starterUsers = [
  { name: "Arta Krasniqi", email: "arta@demo.com", role: "Admin", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
  { name: "Liridon Gashi", email: "liridon@demo.com", role: "Analyst", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
  { name: "Bora Shala", email: "bora@demo.com", role: "User", status: "Inactive", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
  { name: "Dion Pllana", email: "dion@demo.com", role: "User", status: "Active", passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f" },
];

const starterNotifications = [
  { id: 1, title: "Database ready", text: "The news dataset is loaded from the backend database.", time: "Just now", unread: true },
  { id: 2, title: "Classifier active", text: "Hybrid keyword and dataset matching model is ready.", time: "15 min ago", unread: false },
];

export function createEmptyDatabase() {
  return {
    meta: {
      name: "Fake News Detection Local Database",
      version: 1,
      seededAt: null,
    },
    articles: [],
    analyses: [],
    users: starterUsers,
    notifications: starterNotifications,
  };
}

function withDefaultPasswords(users) {
  return users.map((user) => {
    const fallback = starterUsers.find((starter) => starter.email === user.email);
    return {
      ...user,
      passwordHash: user.passwordHash || user.password_hash || fallback?.passwordHash,
    };
  });
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "fake_news_ui",
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}

export async function ensureDatabaseSchema() {
  if (!useMysql) {
    return;
  }

  const db = getPool();
  await db.query("ALTER TABLE articles MODIFY label ENUM('Real', 'Fake', 'Satire', 'Bias', 'Needs Review') NOT NULL");
  await db.query("ALTER TABLE analyses MODIFY label ENUM('Real', 'Fake', 'Satire', 'Bias', 'Needs Review') NOT NULL");
}

function mapArticle(row) {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    subject: row.subject,
    source: row.source,
    label: row.label,
    date: row.published_date || row.date,
  };
}

function mapAnalysis(row) {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    label: row.label,
    confidence: row.confidence,
    model: row.model,
    date: row.analyzed_at ? new Date(row.analyzed_at).toISOString().slice(0, 16).replace("T", " ") : row.date,
    language: row.language || "English",
    articleId: row.article_id,
  };
}

function mapUser(row) {
  return {
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash,
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    title: row.title,
    text: row.message,
    time: row.time_label,
    unread: Boolean(row.unread),
  };
}

async function readMysqlDatabase() {
  const db = getPool();
  const [articles] = await db.query("SELECT id, title, text, subject, source, label, published_date FROM articles ORDER BY published_date DESC, id DESC LIMIT 2000");
  const [analyses] = await db.query("SELECT id, title, source, label, confidence, model, analyzed_at, language, article_id FROM analyses ORDER BY analyzed_at DESC LIMIT 250");
  const [users] = await db.query("SELECT name, email, role, status, password_hash FROM users ORDER BY name");
  const [notifications] = await db.query("SELECT id, title, message, time_label, unread FROM notifications ORDER BY id DESC LIMIT 10");

  return {
    ...createEmptyDatabase(),
    meta: {
      name: "Fake News Detection MySQL Database",
      version: 1,
      seededAt: null,
    },
    articles: articles.map(mapArticle),
    analyses: analyses.map(mapAnalysis),
    users: users.map(mapUser),
    notifications: notifications.map(mapNotification),
  };
}

export async function readDatabase() {
  if (useMysql) {
    return readMysqlDatabase();
  }

  try {
    const content = await fs.readFile(databaseFile, "utf8");
    const database = JSON.parse(content);
    return {
      ...createEmptyDatabase(),
      ...database,
      articles: database.articles || [],
      analyses: database.analyses || [],
      users: withDefaultPasswords(database.users || starterUsers),
      notifications: database.notifications || starterNotifications,
    };
  } catch {
    const database = createEmptyDatabase();
    await writeDatabase(database);
    return database;
  }
}

export async function writeDatabase(database) {
  if (useMysql) {
    return;
  }

  await fs.writeFile(databaseFile, JSON.stringify(database, null, 2), "utf8");
}

export async function saveAnalysis(item, notification) {
  if (!useMysql) {
    const database = await readDatabase();
    database.analyses.unshift(item);
    database.analyses = database.analyses.slice(0, 250);
    database.notifications.unshift(notification);
    database.notifications = database.notifications.slice(0, 10);
    await writeDatabase(database);
    return;
  }

  const db = getPool();
  await db.execute(
    `INSERT INTO analyses (id, title, source, label, confidence, model, analyzed_at, language, article_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.title,
      item.source,
      item.label,
      item.confidence,
      item.model,
      new Date(item.date.replace(" ", "T")),
      item.language,
      item.articleId || null,
    ],
  );
  await db.execute(
    "INSERT INTO notifications (title, message, time_label, unread) VALUES (?, ?, ?, ?)",
    [notification.title, notification.text, notification.time, notification.unread ? 1 : 0],
  );
}

export async function findUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;

  const database = await readDatabase();
  return database.users.find((user) => user.email.toLowerCase() === normalized) || null;
}

export function toAnalysisRow(item) {
  return {
    id: item.id,
    title: item.title,
    source: item.source,
    label: item.label,
    confidence: item.confidence,
    model: item.model,
    date: item.date,
    language: item.language || "English",
  };
}
