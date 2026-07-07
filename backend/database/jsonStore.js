import fs from "fs/promises";
import path from "path";

export const databaseFile = path.resolve("backend", "database.json");

export async function readJsonDatabase(createFallback) {
  try {
    const content = await fs.readFile(databaseFile, "utf8");
    return JSON.parse(content);
  } catch {
    const database = createFallback();
    await writeJsonDatabase(database);
    return database;
  }
}

export async function writeJsonDatabase(database) {
  await fs.mkdir(path.dirname(databaseFile), { recursive: true });
  await fs.writeFile(databaseFile, JSON.stringify(database, null, 2), "utf8");
}
