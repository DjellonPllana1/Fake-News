import { getPool } from "../config/database.js";

export class BaseRepository {
  get pool() {
    return getPool();
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  parseJson(value, fallback = null) {
    if (value == null || value === "") {
      return fallback;
    }

    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      return fallback;
    }
  }

  stringifyJson(value) {
    return value == null ? null : JSON.stringify(value);
  }
}
