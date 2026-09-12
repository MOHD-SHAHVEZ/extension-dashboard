-- Dashboard schema (PostgreSQL)
-- Hibernate ddl-auto=update will create/alter these in development.
-- Use this file as the production migration reference.

CREATE TABLE IF NOT EXISTS app_user (
    id                   BIGSERIAL PRIMARY KEY,
    username             VARCHAR(255) NOT NULL UNIQUE,
    password             VARCHAR(255) NOT NULL,
    role                 VARCHAR(64)  NOT NULL,
    first_name           VARCHAR(255),
    last_name            VARCHAR(255),
    phone                VARCHAR(64),
    persona              VARCHAR(32),
    terms_accepted_at    TIMESTAMP,
    terms_version        VARCHAR(32),
    avatar_data_url      TEXT,
    dark_mode            BOOLEAN NOT NULL DEFAULT FALSE,
    email_notifications  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS task (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    tag             VARCHAR(64),
    time_label      VARCHAR(64),
    priority        VARCHAR(16),
    done            BOOLEAN NOT NULL DEFAULT FALSE,
    ai_synced       BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed       BOOLEAN NOT NULL DEFAULT FALSE,
    source_slot_id  BIGINT,
    sync_date       DATE,
    task_date       DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_task_user_done ON task (user_id, done);
CREATE INDEX IF NOT EXISTS idx_task_user_created ON task (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_user_date ON task (user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_task_user_sync ON task (user_id, source_slot_id, sync_date);
CREATE UNIQUE INDEX IF NOT EXISTS uk_task_schedule_sync
    ON task (user_id, source_slot_id, sync_date)
    WHERE source_slot_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS schedule_slot (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    start_time   VARCHAR(32) NOT NULL,
    end_time     VARCHAR(32) NOT NULL,
    title        VARCHAR(255) NOT NULL,
    description  VARCHAR(2000),
    category     VARCHAR(32) NOT NULL,
    day_code     VARCHAR(8) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_slot_user_day ON schedule_slot (user_id, day_code);
CREATE INDEX IF NOT EXISTS idx_slot_user ON schedule_slot (user_id);

CREATE TABLE IF NOT EXISTS summary (
    id            BIGSERIAL PRIMARY KEY,
    title         VARCHAR(255),
    excerpt       VARCHAR(2000),
    content       TEXT,
    source_url    VARCHAR(2048),
    created_at    VARCHAR(255),
    pinned        BOOLEAN NOT NULL DEFAULT FALSE,
    owner         VARCHAR(255),
    user_id       BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    status        VARCHAR(32) DEFAULT 'READY',
    error_message VARCHAR(1000),
    tags          VARCHAR(500),
    updated_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_summary_owner ON summary (owner);
CREATE INDEX IF NOT EXISTS idx_summary_user_id ON summary (user_id);
CREATE INDEX IF NOT EXISTS idx_summary_user_created ON summary (user_id, created_at);

CREATE TABLE IF NOT EXISTS notebook (
    id            BIGSERIAL PRIMARY KEY,
    subject_name  VARCHAR(80)  NOT NULL,
    color         VARCHAR(16)  NOT NULL,
    owner         VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notebook_owner_created ON notebook (owner, created_at);

CREATE TABLE IF NOT EXISTS lesson_note (
    id            BIGSERIAL PRIMARY KEY,
    notebook_id   BIGINT       NOT NULL REFERENCES notebook (id) ON DELETE CASCADE,
    lesson_title  VARCHAR(200) NOT NULL,
    content       TEXT,
    owner         VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lesson_notebook ON lesson_note (notebook_id);
CREATE INDEX IF NOT EXISTS idx_lesson_owner ON lesson_note (owner);

CREATE TABLE IF NOT EXISTS lesson_ai_summary (
    id            BIGSERIAL PRIMARY KEY,
    lesson_id     BIGINT       NOT NULL,
    notebook_id   BIGINT       NOT NULL,
    owner         VARCHAR(255) NOT NULL,
    lesson_title  VARCHAR(200),
    title         VARCHAR(255),
    excerpt       VARCHAR(2000),
    content       TEXT,
    model_used    VARCHAR(64),
    status        VARCHAR(16)  NOT NULL,
    saved         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lesson_ai_owner ON lesson_ai_summary (owner);
CREATE INDEX IF NOT EXISTS idx_lesson_ai_lesson ON lesson_ai_summary (lesson_id, saved);
