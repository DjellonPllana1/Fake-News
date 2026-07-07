import { BaseRepository } from "./BaseRepository.js";

function mapLog(row = {}) {
  return {
    id: row.id,
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    method: row.method,
    path: row.path,
    statusCode: Number(row.status_code || 0),
    durationMs: Number(row.duration_ms || 0),
    userEmail: row.user_email || "Anonymous",
    userRole: row.user_role || "Anonymous",
    ip: row.ip || "",
  };
}

export class LogRepository extends BaseRepository {
  async create(entry = {}) {
    await this.query(
      `INSERT INTO api_logs (method, path, status_code, duration_ms, user_email, user_role, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.method || "GET",
        entry.path || "/",
        Number(entry.statusCode || 0),
        Number(entry.durationMs || 0),
        entry.userEmail || "Anonymous",
        entry.userRole || "Anonymous",
        entry.ip || "",
      ]
    );
  }

  async list(limit = 100) {
    const safeLimit = Math.max(1, Math.min(Number(limit || 100), 250));
    const rows = await this.query(`SELECT * FROM api_logs ORDER BY created_at DESC, id DESC LIMIT ${safeLimit}`);
    return rows.map(mapLog);
  }
}
