-- Reference DDL for PostgreSQL (Hibernate ddl-auto=update also creates these).
-- Create DB once:  CREATE DATABASE summaries_db;

CREATE TABLE IF NOT EXISTS summary
(
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(255),
    excerpt    VARCHAR(2000),
    content    VARCHAR(10000),
    source_url VARCHAR(255),
    created_at VARCHAR(255),
    pinned     BOOLEAN NOT NULL DEFAULT FALSE,
    owner      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_summary_owner ON summary (owner);
