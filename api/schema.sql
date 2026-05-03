CREATE DATABASE IF NOT EXISTS sexo10k CHARACTER
SET
  utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sexo10k;

CREATE TABLE
  IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    role ENUM ('user', 'admin') NOT NULL DEFAULT 'user',
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email)
  );

CREATE TABLE
  IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL,
    expires INT UNSIGNED NOT NULL,
    data MEDIUMTEXT,
    PRIMARY KEY (session_id)
  );

CREATE TABLE
  IF NOT EXISTS games (
    id CHAR(36) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NULL,
    serial VARCHAR(30) NOT NULL,
    iso_path VARCHAR(500) NOT NULL,
    cover_url VARCHAR(500) NULL,
    is_active TINYINT (1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY games_serial_unique (serial)
  );

CREATE TABLE
  IF NOT EXISTS game_sessions (
    id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    game_id CHAR(36) NULL,
    status ENUM ('starting', 'running', 'stopped', 'failed') NOT NULL DEFAULT 'starting',
    stream_id VARCHAR(120) NULL,
    host_message VARCHAR(500) NULL,
    error_message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME NULL DEFAULT NULL,
    stopped_at DATETIME NULL DEFAULT NULL,
    failed_at DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY game_sessions_user_id_index (user_id),
    KEY game_sessions_game_id_index (game_id),
    KEY game_sessions_status_index (status),
    CONSTRAINT game_sessions_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT game_sessions_game_id_fk FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE SET NULL
  );