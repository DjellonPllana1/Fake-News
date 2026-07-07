CREATE DATABASE IF NOT EXISTS `fake_news_ai`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `fake_news_ai`;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash CHAR(64) NOT NULL,
  role ENUM('Admin', 'Analyst', 'User') NOT NULL DEFAULT 'User',
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(700) NOT NULL,
  text MEDIUMTEXT NOT NULL,
  subject VARCHAR(160),
  source VARCHAR(240),
  label ENUM('REAL', 'FAKE') NOT NULL,
  published_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_articles_label_date (label, published_date),
  FULLTEXT INDEX ft_articles_title_text (title, text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analyses (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(700) NOT NULL,
  source VARCHAR(260),
  url VARCHAR(1000),
  label ENUM('REAL', 'FAKE', 'UNCERTAIN') NOT NULL,
  confidence TINYINT UNSIGNED NOT NULL DEFAULT 0,
  model VARCHAR(180) NOT NULL,
  risk_level ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  analyzed_at DATETIME NOT NULL,
  language VARCHAR(80) NOT NULL DEFAULT 'English',
  article_id VARCHAR(64),
  details_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_analyses_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
  INDEX idx_analyses_analyzed_at (analyzed_at),
  INDEX idx_analyses_label (label),
  INDEX idx_analyses_risk_level (risk_level),
  FULLTEXT INDEX ft_analyses_title_source (title, source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  analysis_id VARCHAR(64),
  event_type VARCHAR(80) NOT NULL,
  title VARCHAR(700),
  label VARCHAR(40),
  confidence TINYINT UNSIGNED,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_history_analysis_event (analysis_id, event_type),
  CONSTRAINT fk_history_analysis FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
  INDEX idx_history_occurred_at (occurred_at),
  INDEX idx_history_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS model_metrics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  model_key VARCHAR(120) NOT NULL,
  model_name VARCHAR(180) NOT NULL,
  version VARCHAR(120),
  accuracy DECIMAL(8,6),
  precision_score DECIMAL(8,6),
  recall_score DECIMAL(8,6),
  f1_score DECIMAL(8,6),
  metrics_json JSON,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_model_metrics_key_version (model_key, version),
  INDEX idx_model_metrics_generated_at (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(12) NOT NULL,
  path VARCHAR(700) NOT NULL,
  status_code SMALLINT UNSIGNED NOT NULL,
  duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
  user_email VARCHAR(190) DEFAULT 'Anonymous',
  user_role VARCHAR(60) DEFAULT 'Anonymous',
  ip VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_logs_created_at (created_at),
  INDEX idx_api_logs_path (path(191)),
  INDEX idx_api_logs_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status ENUM('queued', 'started', 'running', 'completed', 'failed') NOT NULL DEFAULT 'queued',
  started_at DATETIME,
  finished_at DATETIME,
  details_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_training_jobs_status (status),
  INDEX idx_training_jobs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  severity ENUM('debug', 'info', 'warning', 'error') NOT NULL DEFAULT 'info',
  message VARCHAR(1000) NOT NULL,
  metadata_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_system_events_created_at (created_at),
  INDEX idx_system_events_type_severity (event_type, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  message VARCHAR(700) NOT NULL,
  time_label VARCHAR(80) NOT NULL DEFAULT 'Just now',
  unread TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_created_at (created_at),
  INDEX idx_notifications_unread (unread)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
