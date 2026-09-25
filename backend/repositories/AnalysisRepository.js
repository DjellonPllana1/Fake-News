import { BaseRepository } from "./BaseRepository.js";

function toMysqlDate(value) {
  if (!value) {
    return new Date();
  }

  const parsed = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
}

function formatRowDate(value) {
  if (!value) {
    return "";
  }

  const parsed = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(parsed.valueOf())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function mapAnalysis(row = {}, parseJson = JSON.parse) {
  const details = row.details_json ? parseJson(row.details_json, {}) || {} : {};

  return {
    ...details,
    id: row.id,
    title: row.title,
    source: row.source,
    url: row.url || "",
    label: row.label,
    prediction: row.label,
    confidence: Number(row.confidence || 0),
    model: row.model,
    riskLevel: row.risk_level,
    date: formatRowDate(row.analyzed_at),
    language: row.language || details.language || "English",
    articleId: row.article_id,
  };
}

export class AnalysisRepository extends BaseRepository {
  async list({ limit = 500 } = {}) {
    const safeLimit = Math.max(1, Math.min(Number(limit || 500), 5000));
    const rows = await this.query(`SELECT * FROM analyses ORDER BY analyzed_at DESC LIMIT ${safeLimit}`);
    return rows.map((row) => mapAnalysis(row, this.parseJson.bind(this)));
  }

  async findById(id) {
    const rows = await this.query("SELECT * FROM analyses WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? mapAnalysis(rows[0], this.parseJson.bind(this)) : null;
  }

  async save(analysis = {}) {
    const details = { ...analysis };
    delete details.id;
    delete details.title;
    delete details.source;
    delete details.url;
    delete details.label;
    delete details.prediction;
    delete details.confidence;
    delete details.model;
    delete details.riskLevel;
    delete details.risk_level;
    delete details.date;
    delete details.language;
    delete details.articleId;
    delete details.article_id;

    await this.query(
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
        analysis.id,
        analysis.title,
        analysis.source,
        analysis.url || null,
        analysis.label,
        Number(analysis.confidence || 0),
        analysis.model || "Unknown model",
        analysis.riskLevel || analysis.risk_level || "MEDIUM",
        toMysqlDate(analysis.date),
        analysis.language || analysis.languageInfo?.name || "English",
        analysis.articleId || analysis.article_id || null,
        this.stringifyJson(details),
      ]
    );

    await this.query(
      `INSERT INTO history (analysis_id, event_type, title, label, confidence, occurred_at, payload_json)
       VALUES (?, 'analysis_saved', ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         label = VALUES(label),
         confidence = VALUES(confidence),
         occurred_at = VALUES(occurred_at),
         payload_json = VALUES(payload_json)`,
      [analysis.id, analysis.title, analysis.label, Number(analysis.confidence || 0), toMysqlDate(analysis.date), this.stringifyJson(analysis)]
    );

    return analysis;
  }

  async deleteById(id) {
    const [result] = await this.pool.execute("DELETE FROM analyses WHERE id = ?", [id]);
    return Boolean(result?.affectedRows);
  }
}
