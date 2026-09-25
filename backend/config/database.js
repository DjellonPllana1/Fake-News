import mysql from "mysql2/promise";
import "../env.js";

export function isDatabaseEnabled() {
  return String(process.env.DB_ENABLED ?? "true").toLowerCase() !== "false";
}

export function getDatabaseConfig({ includeDatabase = true } = {}) {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    ...(includeDatabase ? { database: process.env.DB_NAME || "fake_news_ai" } : {}),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    multipleStatements: true,
    charset: "utf8mb4",
  };
}

let pool;

export function getPool() {
  if (!isDatabaseEnabled()) {
    throw new Error("MySQL is disabled. Set DB_ENABLED=true to use the database connection pool.");
  }

  if (!pool) {
    pool = mysql.createPool(getDatabaseConfig());
  }

  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export { mysql };
