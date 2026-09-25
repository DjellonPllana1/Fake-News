import { BaseRepository } from "./BaseRepository.js";

export class MetricsRepository extends BaseRepository {
  async saveModelMetrics(metrics = {}) {
    await this.query(
      `INSERT INTO model_metrics (model_key, model_name, version, accuracy, precision_score, recall_score, f1_score, metrics_json, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         model_name = VALUES(model_name),
         version = VALUES(version),
         accuracy = VALUES(accuracy),
         precision_score = VALUES(precision_score),
         recall_score = VALUES(recall_score),
         f1_score = VALUES(f1_score),
         metrics_json = VALUES(metrics_json),
         generated_at = VALUES(generated_at)`,
      [
        metrics.id || metrics.model_key || "current",
        metrics.name || metrics.model_name || metrics.best_model?.name || "Current model",
        metrics.version || metrics.model_version || metrics.best_model?.version || null,
        metrics.accuracy ?? metrics.best_model?.accuracy ?? null,
        metrics.precision ?? metrics.best_model?.precision ?? null,
        metrics.recall ?? metrics.best_model?.recall ?? null,
        metrics.f1 ?? metrics.best_model?.f1 ?? null,
        this.stringifyJson(metrics),
        metrics.generated_at ? new Date(metrics.generated_at) : new Date(),
      ]
    );
  }

  async latestModelMetrics() {
    const rows = await this.query("SELECT * FROM model_metrics ORDER BY generated_at DESC, id DESC LIMIT 1");
    return rows[0] ? this.parseJson(rows[0].metrics_json, null) : null;
  }

  async createTrainingJob(job = {}) {
    const rows = await this.query(
      "INSERT INTO training_jobs (status, started_at, finished_at, details_json) VALUES (?, ?, ?, ?)",
      [job.status || "started", job.startedAt || new Date(), job.finishedAt || null, this.stringifyJson(job.details || job)]
    );
    return rows.insertId;
  }

  async recordSystemEvent(event = {}) {
    await this.query("INSERT INTO system_events (event_type, severity, message, metadata_json) VALUES (?, ?, ?, ?)", [
      event.eventType || event.type || "system",
      event.severity || "info",
      event.message || "",
      this.stringifyJson(event.metadata || event),
    ]);
  }
}
