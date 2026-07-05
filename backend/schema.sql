CREATE DATABASE IF NOT EXISTS fake_news_ui
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fake_news_ui;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash CHAR(64) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'User',
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS articles (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(600) NOT NULL,
  text MEDIUMTEXT NOT NULL,
  subject VARCHAR(120),
  source VARCHAR(160),
  label ENUM('Real', 'Fake', 'Satire', 'Bias', 'Needs Review') NOT NULL,
  published_date DATE,
  INDEX idx_articles_label (label),
  FULLTEXT INDEX ft_articles_title_text (title, text)
);

CREATE TABLE IF NOT EXISTS analyses (
  id VARCHAR(40) PRIMARY KEY,
  title VARCHAR(600) NOT NULL,
  source VARCHAR(200),
  label ENUM('Real', 'Fake', 'Satire', 'Bias', 'Needs Review') NOT NULL,
  confidence INT NOT NULL,
  model VARCHAR(120) NOT NULL,
  analyzed_at DATETIME NOT NULL,
  language VARCHAR(40) DEFAULT 'English',
  article_id VARCHAR(32),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  message VARCHAR(500) NOT NULL,
  time_label VARCHAR(60) NOT NULL DEFAULT 'Just now',
  unread TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO users (name, email, password_hash, role, status) VALUES
  ('Dion Pllana', 'dion@demo.com', SHA2('password123', 256), 'Admin', 'Active'),
  ('Arta Krasniqi', 'arta@demo.com', SHA2('password123', 256), 'Admin', 'Active'),
  ('Liridon Gashi', 'liridon@demo.com', SHA2('password123', 256), 'Analyst', 'Active'),
  ('Bora Shala', 'bora@demo.com', SHA2('password123', 256), 'User', 'Inactive');
