# MySQL → PostgreSQL Migration Notes

> **Learning guide (start here if new to Postgres):**  
> [`NoteLearnPostGreMigration.md`](./NoteLearnPostGreMigration.md)

| Field | Value |
|-------|-------|
| **Status** | Applied in codebase (2026-09-10) |
| **Approach** | Greenfield schema via Hibernate `ddl-auto=update` |
| **Data copy** | Not included — start empty Postgres (or import separately with pgloader — see learning guide §9–10) |

## Code changes applied

1. `pom.xml` — `mysql-connector-java` → `org.postgresql:postgresql`
2. `application.properties` — JDBC URL, driver, `PostgreSQLDialect`, HikariCP + JDBC batch tuning
3. `ddl_Summary.sql` — Postgres-compatible reference DDL + owner index

## Local setup

```bash
# Install / start Postgres, then:
createdb summaries_db
# or: psql -U postgres -c "CREATE DATABASE summaries_db;"

export DB_URL="jdbc:postgresql://localhost:5432/summaries_db"
export DB_USERNAME="postgres"
export DB_PASSWORD="yourpassword"

./mvnw spring-boot:run
```

Hibernate will create `app_user` / `summary` tables on first boot.

## Cloud (Neon / Supabase / Render)

```env
DB_URL=jdbc:postgresql://<host>:5432/<db>?sslmode=require
DB_USERNAME=...
DB_PASSWORD=...
```

## Performance knobs (already set)

| Setting | Value | Why |
|---------|-------|-----|
| Hikari `maximum-pool-size` | 10 (env `DB_POOL_MAX`) | Small API; avoid over-connecting free-tier DBs |
| `open-in-view` | `false` | No lazy DB work in view layer |
| `jdbc.batch_size` | 25 | Fewer round-trips on multi-row writes |
| Index on `summary.owner` | in `ddl_Summary.sql` | Faster list-by-owner (run SQL or add `@Table(indexes=…)`) |

## If you need old MySQL data

Use `pgloader` / CSV export — driver switch alone does **not** move rows.
