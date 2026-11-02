-- =====================================================================================
--  Smart To-Do & Timetable Manager - MySQL 8.0+ schema
--
--  Equivalent to the Sequelize migrations in backend/src/database/migrations.
--  Use EITHER this script OR `npm run db:migrate` (this script also records the
--  migrations in sequelize_meta so a later `db:migrate` will not try to re-create tables).
--
--  All DATETIME columns hold UTC. DATE/TIME columns on tasks hold the user's local
--  date/time (users.timezone); start_at_utc / end_at_utc hold the same instants in UTC.
-- =====================================================================================

CREATE DATABASE IF NOT EXISTS smart_timetable_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_timetable_db;

SET time_zone = '+00:00';

-- -------------------------------------------------------------------------------------
-- users
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              BIGINT        NOT NULL AUTO_INCREMENT,
  name            VARCHAR(150)  NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  country_code    VARCHAR(6)    NOT NULL DEFAULT '+1',
  phone_number    VARCHAR(20)   NOT NULL,             -- national number, digits only
  password        VARCHAR(255)  NOT NULL,             -- bcrypt hash, never plaintext
  timezone        VARCHAR(100)  NOT NULL DEFAULT 'UTC', -- IANA zone, e.g. Asia/Kolkata
  profile_image   VARCHAR(500)  NULL,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  token_version   INT           NOT NULL DEFAULT 0,   -- bump to revoke issued JWTs
  last_login_at   DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_timezone (timezone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- timetable_settings  (1:1 users) - the timetable editing window
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timetable_settings (
  id               BIGINT    NOT NULL AUTO_INCREMENT,
  user_id          BIGINT    NOT NULL,
  editing_enabled  BOOLEAN   NOT NULL DEFAULT FALSE,  -- FALSE = no restriction
  start_time       TIME      NOT NULL DEFAULT '06:00:00',
  end_time         TIME      NOT NULL DEFAULT '09:00:00',
  applicable_days  JSON      NOT NULL,                -- ISO weekdays, e.g. [1,2,3,4,5]
  created_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timetable_settings_user (user_id),
  CONSTRAINT fk_timetable_settings_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- timetables  (N:1 users) - one per user per day
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timetables (
  id             BIGINT        NOT NULL AUTO_INCREMENT,
  user_id        BIGINT        NOT NULL,
  title          VARCHAR(255)  NOT NULL,
  schedule_date  DATE          NOT NULL,
  status         ENUM('ACTIVE','LOCKED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timetables_user_date (user_id, schedule_date),
  KEY idx_timetables_schedule_date (schedule_date),
  KEY idx_timetables_status (status),
  CONSTRAINT fk_timetables_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- tasks  (N:1 timetables, N:1 users)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id                 BIGINT        NOT NULL AUTO_INCREMENT,
  timetable_id       BIGINT        NOT NULL,
  user_id            BIGINT        NOT NULL,
  title              VARCHAR(255)  NOT NULL,
  description        TEXT          NULL,
  schedule_date      DATE          NOT NULL,       -- local date (denormalised for overlap checks)
  start_time         TIME          NOT NULL,       -- local time
  end_time           TIME          NOT NULL,       -- local time, > start_time
  start_at_utc       DATETIME      NOT NULL,
  end_at_utc         DATETIME      NOT NULL,
  category           VARCHAR(100)  NOT NULL DEFAULT 'Personal',
  priority           ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  status             ENUM('UPCOMING','ONGOING','COMPLETED','SKIPPED','MISSED') NOT NULL DEFAULT 'UPCOMING',
  repeat_type        ENUM('NONE','DAILY','WEEKLY','CUSTOM') NOT NULL DEFAULT 'NONE',
  repeat_days        JSON          NULL,           -- CUSTOM: ISO weekdays
  repeat_until       DATE          NULL,
  repeat_exceptions  JSON          NULL,           -- dates whose occurrence was deleted
  source_task_id     BIGINT        NULL,           -- recurring template this occurrence came from
  allow_overlap      BOOLEAN       NOT NULL DEFAULT FALSE,
  reminder_enabled   BOOLEAN       NOT NULL DEFAULT TRUE,
  whatsapp_reminder  BOOLEAN       NOT NULL DEFAULT TRUE,
  email_reminder     BOOLEAN       NOT NULL DEFAULT TRUE,
  schedule_version   INT           NOT NULL DEFAULT 1, -- bumped on every date/time change
  completed_at       DATETIME      NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_timetable (timetable_id),
  KEY idx_tasks_user_date (user_id, schedule_date),
  KEY idx_tasks_status_start (status, start_at_utc),
  KEY idx_tasks_status_end (status, end_at_utc),
  UNIQUE KEY uq_tasks_source_date (source_task_id, schedule_date),
  CONSTRAINT fk_tasks_timetable FOREIGN KEY (timetable_id) REFERENCES timetables (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_source FOREIGN KEY (source_task_id) REFERENCES tasks (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_tasks_time CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- notification_settings  (1:1 users) - independent WhatsApp / Email switches
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_settings (
  id                              BIGINT    NOT NULL AUTO_INCREMENT,
  user_id                         BIGINT    NOT NULL,
  whatsapp_enabled                BOOLEAN   NOT NULL DEFAULT FALSE,
  whatsapp_opt_in                 BOOLEAN   NOT NULL DEFAULT FALSE,  -- explicit consent
  whatsapp_opt_in_at              DATETIME  NULL,
  whatsapp_task_start             BOOLEAN   NOT NULL DEFAULT TRUE,
  whatsapp_advance_reminder       BOOLEAN   NOT NULL DEFAULT TRUE,
  whatsapp_update_notification    BOOLEAN   NOT NULL DEFAULT TRUE,
  whatsapp_deletion_notification  BOOLEAN   NOT NULL DEFAULT TRUE,
  whatsapp_daily_summary          BOOLEAN   NOT NULL DEFAULT FALSE,
  email_enabled                   BOOLEAN   NOT NULL DEFAULT TRUE,
  email_task_start                BOOLEAN   NOT NULL DEFAULT TRUE,
  email_advance_reminder          BOOLEAN   NOT NULL DEFAULT TRUE,
  email_update_notification       BOOLEAN   NOT NULL DEFAULT TRUE,
  email_deletion_notification     BOOLEAN   NOT NULL DEFAULT TRUE,
  email_daily_summary             BOOLEAN   NOT NULL DEFAULT TRUE,
  incomplete_reminder             BOOLEAN   NOT NULL DEFAULT FALSE,
  reminder_minutes                INT       NOT NULL DEFAULT 10,     -- 5 / 10 / 15 / 30
  daily_summary_time              TIME      NOT NULL DEFAULT '07:00:00',
  quiet_hours_enabled             BOOLEAN   NOT NULL DEFAULT FALSE,
  quiet_hours_start               TIME      NULL,
  quiet_hours_end                 TIME      NULL,
  notification_sound              BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at                      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_settings_user (user_id),
  CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- notification_logs  (N:1 users, N:1 tasks with SET NULL to keep history)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
  id                   BIGINT        NOT NULL AUTO_INCREMENT,
  user_id              BIGINT        NOT NULL,
  task_id              BIGINT        NULL,
  task_title           VARCHAR(255)  NULL,        -- snapshot, survives task deletion
  notification_type    ENUM('WHATSAPP','EMAIL') NOT NULL,
  event_type           VARCHAR(100)  NOT NULL,    -- ADVANCE_REMINDER, TASK_START, TASK_UPDATED, ...
  subject              VARCHAR(255)  NULL,
  message              TEXT          NOT NULL,
  payload              JSON          NULL,
  recipient            VARCHAR(255)  NULL,
  idempotency_key      VARCHAR(191)  NOT NULL,    -- prevents duplicate notifications
  scheduled_at         DATETIME      NOT NULL,
  sent_at              DATETIME      NULL,
  delivery_status      ENUM('PENDING','SENT','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  provider_status      VARCHAR(50)   NULL,        -- WhatsApp webhook: sent / delivered / read / failed
  provider_message_id  VARCHAR(255)  NULL,
  error_message        TEXT          NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_logs_idempotency (idempotency_key),
  KEY idx_notification_logs_user_created (user_id, created_at),
  KEY idx_notification_logs_user_status (user_id, delivery_status),
  KEY idx_notification_logs_task (task_id),
  KEY idx_notification_logs_scheduled (scheduled_at),
  KEY idx_notification_logs_provider_msg (provider_message_id),
  CONSTRAINT fk_notification_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notification_logs_task FOREIGN KEY (task_id) REFERENCES tasks (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- password_resets  (N:1 users) - only SHA-256 hashes of tokens are stored
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  user_id     BIGINT        NOT NULL,
  token_hash  VARCHAR(255)  NOT NULL,
  expires_at  DATETIME      NOT NULL,
  used_at     DATETIME      NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_resets_token (token_hash),
  KEY idx_password_resets_user (user_id),
  KEY idx_password_resets_expires (expires_at),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- notification_jobs  (1:1 notification_logs) - durable queue state
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_jobs (
  id                   BIGINT        NOT NULL AUTO_INCREMENT,
  notification_log_id  BIGINT        NOT NULL,
  job_type             VARCHAR(100)  NOT NULL,
  scheduled_at         DATETIME      NOT NULL,   -- intended delivery time
  run_at               DATETIME      NOT NULL,   -- next attempt (retry backoff / quiet hours)
  status               ENUM('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  attempts             INT           NOT NULL DEFAULT 0,
  last_error           TEXT          NULL,
  locked_at            DATETIME      NULL,
  queue_job_id         VARCHAR(191)  NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_jobs_log (notification_log_id),
  KEY idx_notification_jobs_status_run (status, run_at),
  KEY idx_notification_jobs_scheduled (scheduled_at),
  CONSTRAINT fk_notification_jobs_log FOREIGN KEY (notification_log_id) REFERENCES notification_logs (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- Mark the equivalent Sequelize migrations as applied
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sequelize_meta (
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO sequelize_meta (name) VALUES
  ('20261102000001-create-users.js'),
  ('20261102000002-create-timetable-settings.js'),
  ('20261102000003-create-timetables.js'),
  ('20261102000004-create-tasks.js'),
  ('20261102000005-create-notification-settings.js'),
  ('20261102000006-create-notification-logs.js'),
  ('20261102000007-create-password-resets.js'),
  ('20261102000008-create-notification-jobs.js');
