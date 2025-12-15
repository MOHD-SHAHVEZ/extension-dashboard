CREATE TABLE summary
(
    id         BIGINT AUTO_INCREMENT NOT NULL,
    title      VARCHAR(255)          NULL,
    excerpt    VARCHAR(2000)         NULL,
    content    VARCHAR(10000)        NULL,
    source_url VARCHAR(255)          NULL,
    created_at VARCHAR(255)          NULL,
    pinned     BIT(1)                NOT NULL,
    owner      VARCHAR(255)          NULL,
    CONSTRAINT pk_summary PRIMARY KEY (id)
);