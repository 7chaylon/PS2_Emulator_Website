-- BACKUP COMPLETO DO BANCO sexo10k
-- Gerado manualmente para segurança

CREATE DATABASE IF NOT EXISTS sexo10k
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sexo10k;

-- =========================
-- TABELA users
-- =========================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
);

-- =========================
-- TABELA sessions
-- =========================

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires INT(11) UNSIGNED NOT NULL,
  data MEDIUMTEXT,
  PRIMARY KEY (session_id)
);

-- =========================
-- TABELA games
-- =========================

CREATE TABLE IF NOT EXISTS games (
  id CHAR(36) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  serial VARCHAR(30) NOT NULL,
  iso_path VARCHAR(500) NOT NULL,
  cover_url VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY games_serial_unique (serial)
);

-- =========================
-- TABELA game_sessions
-- =========================

CREATE TABLE IF NOT EXISTS game_sessions (
  id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id CHAR(36) NULL,
  status ENUM('starting', 'running', 'stopped', 'failed') NOT NULL DEFAULT 'starting',
  stream_id VARCHAR(120) NOT NULL,
  host_message TEXT NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME NULL,
  stopped_at DATETIME NULL,
  failed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY game_sessions_user_id_index (user_id),
  KEY game_sessions_game_id_index (game_id),
  CONSTRAINT game_sessions_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE SET NULL
);

-- =========================
-- TABELA user_control_profiles
-- =========================

CREATE TABLE IF NOT EXISTS user_control_profiles (
  id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  profile_name VARCHAR(100) NOT NULL DEFAULT 'Padrão',
  bindings_json JSON NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_control_profiles_user_unique (user_id),
  CONSTRAINT fk_user_control_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);