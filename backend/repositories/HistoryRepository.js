import { BaseRepository } from "./BaseRepository.js";

function mapArticle(row = {}) {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    subject: row.subject,
    source: row.source,
    label: row.label,
    date: row.published_date ? String(row.published_date).slice(0, 10) : "",
  };
}

function mapNotification(row = {}) {
  return {
    id: row.id,
    title: row.title,
    text: row.message,
    time: row.time_label,
    unread: Boolean(row.unread),
  };
}

export class HistoryRepository extends BaseRepository {
  async listArticles({ limit = 3000 } = {}) {
    const safeLimit = Math.max(1, Math.min(Number(limit || 3000), 10000));
    const rows = await this.query(`SELECT * FROM articles ORDER BY published_date DESC, id DESC LIMIT ${safeLimit}`);
    return rows.map(mapArticle);
  }

  async upsertArticle(article = {}) {
    await this.query(
      `INSERT INTO articles (id, title, text, subject, source, label, published_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         text = VALUES(text),
         subject = VALUES(subject),
         source = VALUES(source),
         label = VALUES(label),
         published_date = VALUES(published_date)`,
      [article.id, article.title, article.text, article.subject, article.source, article.label, article.date || article.published_date || null]
    );
  }

  async deleteArticleById(id) {
    const [result] = await this.pool.execute("DELETE FROM articles WHERE id = ?", [id]);
    return Boolean(result?.affectedRows);
  }

  async addNotification(notification = {}) {
    await this.query("INSERT INTO notifications (title, message, time_label, unread) VALUES (?, ?, ?, ?)", [
      notification.title,
      notification.text || notification.message || "",
      notification.time || notification.time_label || "Just now",
      notification.unread ? 1 : 0,
    ]);
  }

  async listNotifications({ limit = 20 } = {}) {
    const safeLimit = Math.max(1, Math.min(Number(limit || 20), 250));
    const rows = await this.query(`SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT ${safeLimit}`);
    return rows.map(mapNotification);
  }
}
