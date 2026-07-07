import { readFile } from "fs/promises";
import path from "path";
import { getDatabaseConfig, mysql } from "../config/database.js";

const schemaPath = path.resolve("backend", "database", "schema.sql");
const schema = (await readFile(schemaPath, "utf8")).replaceAll("`fake_news_ai`", `\`${process.env.DB_NAME || "fake_news_ai"}\``);
const connection = await mysql.createConnection(getDatabaseConfig({ includeDatabase: false }));

try {
  await connection.query(schema);
  console.log(`MySQL schema migrated successfully from ${path.relative(process.cwd(), schemaPath)}.`);
} finally {
  await connection.end();
}
