# NoteLearnPostGreMigration — Complete Learning Guide

| Field | Value |
|-------|-------|
| **File** | `NoteLearnPostGreMigration.md` |
| **Audience** | You (learning from zero / almost zero) |
| **Project** | Nexus Extension Backend (Spring Boot) |
| **Goal** | Understand PostgreSQL + safely move from MySQL → PostgreSQL |
| **Related** | [`MYSQL_TO_POSTGRES.md`](./MYSQL_TO_POSTGRES.md) (short ops notes) |
| **Last updated** | 2026-09-10 |

> Is document ko **top → bottom** padho. Har section ke baad “Practice” try karo.  
> Theory + tumhare project pe real migration — dono cover hai.

---

## Table of contents

1. [Kya seekhna hai (roadmap)](#1-kya-seekhna-hai-roadmap)
2. [Database basics (pehle ye clear ho)](#2-database-basics-pehle-ye-clear-ho)
3. [MySQL vs PostgreSQL — farq](#3-mysql-vs-postgresql--farq)
4. [PostgreSQL — kya seekho (syllabus)](#4-postgresql--kya-seekho-syllabus)
5. [Tumhare project me migration ka matlab](#5-tumhare-project-me-migration-ka-matlab)
6. [Do alag kaam: code switch vs data copy](#6-do-alag-kaam-code-switch-vs-data-copy)
7. [PostgreSQL install & first commands](#7-postgresql-install--first-commands)
8. [Spring Boot ko Postgres se kaise jodte ho](#8-spring-boot-ko-postgres-se-kaise-jodte-ho)
9. [pgloader kya hai aur kaise kaam karta hai](#9-pgloader-kya-hai-aur-kaise-kaam-karta-hai)
10. [Step-by-step: purana MySQL data Postgres me lao](#10-step-by-step-purana-mysql-data-postgres-me-lao)
11. [Verify + common errors](#11-verify--common-errors)
12. [Practice checklist (tumhare liye)](#12-practice-checklist-tumhare-liye)
13. [Glossary (shabdon ka matlab)](#13-glossary-shabdon-ka-matlab)
14. [Next learning after this](#14-next-learning-after-this)

---

## 1. Kya seekhna hai (roadmap)

Migration “sirf driver badalna” nahi hai. Teen layers hain:

```text
A) Database concepts     → row, table, schema, SQL, connection
B) PostgreSQL tools      → psql, createdb, users, ports
C) Migration mechanics   → Spring config + pgloader (data copy)
```

### Seekhne ka order (recommended)

| Week / Day | Topic | Outcome |
|------------|--------|---------|
| Day 1 | SQL basics + tables | `SELECT` / `INSERT` samajh aaye |
| Day 2 | Install Postgres + `psql` | DB create, table create, query |
| Day 3 | JDBC URL + Spring datasource | App Postgres se connect |
| Day 4 | Why dialect / driver matter | MySQL vs Postgres config farq |
| Day 5 | pgloader theory + dry run | Data copy flow clear |
| Day 6 | Full migrate + verify | Counts match, login works |

---

## 2. Database basics (pehle ye clear ho)

### 2.1 Simple picture

```text
Application (Spring Boot)
        │
        │  JDBC URL + username + password
        ▼
   Database Server (PostgreSQL process on port 5432)
        │
        ▼
   Database (e.g. summaries_db)
        │
        ├── table: app_user   (rows = users)
        └── table: summary    (rows = saved summaries)
```

- **Server** = Postgres software jo machine pe chal raha hai.  
- **Database** = us server ke andar ek “folder” (named DB).  
- **Table** = Excel sheet jaisi structure.  
- **Row** = ek record (ek user, ek summary).  
- **Column** = field (`username`, `password`, `title`…).

### 2.2 Tumhari app tables (approx)

| Table | Purpose |
|-------|---------|
| `app_user` | Login users (email = username, bcrypt password, role, profile fields) |
| `summary` | Extension summaries (title, content, owner, …) |

Hibernate (`ddl-auto=update`) pehli baar app chalate waqt tables bana sakta hai — **lekin purana MySQL data automatically copy nahi hota**.

### 2.3 Connection string (JDBC URL)

```text
jdbc:postgresql://localhost:5432/summaries_db
│      │            │         │    │
│      │            │         │    └─ database name
│      │            │         └─ port (Postgres default 5432)
│      │            └─ host
│      └─ database type
└─ Java protocol
```

MySQL pe ye hota tha:

```text
jdbc:mysql://localhost:3306/summaries_db
```

Port alag: MySQL **3306**, PostgreSQL **5432**.

---

## 3. MySQL vs PostgreSQL — farq

| Topic | MySQL | PostgreSQL |
|-------|-------|------------|
| Default port | 3306 | 5432 |
| Auto ID | `AUTO_INCREMENT` | `SERIAL` / `BIGSERIAL` / `IDENTITY` |
| True/false | often `TINYINT(1)` / `BIT` | native `BOOLEAN` |
| Strict SQL | thoda soft historically | stricter, powerful |
| Free cloud | many hosts | Neon, Supabase, Render, Railway… |
| Tumhara Athena Chatbot backend | already Postgres (Neon) | same family — seekhna useful |

**Kyun migrate?**  
- Industry me Postgres bohot common (especially SaaS / vectors / JSON).  
- Tumhare dusre project (Athena) pehle se Postgres use karta hai — ek skill dono jagah kaam aati hai.  
- Better standards + features long-term.

---

## 4. PostgreSQL — kya seekho (syllabus)

### Level 1 — Must know (migration ke liye)

1. Install + start/stop service  
2. `psql` CLI open karna  
3. `CREATE DATABASE` / `\c` connect  
4. `\dt` list tables, `\d table` describe  
5. Basic SQL: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `COUNT(*)`  
6. Users & passwords (`postgres` role)  
7. Port `5432` + firewall basics  
8. Env vars: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`

### Level 2 — Should know (production)

1. Indexes (`CREATE INDEX`) — kyun fast queries  
2. Transactions (`BEGIN` / `COMMIT` / `ROLLBACK`)  
3. Backups: `pg_dump` / `pg_restore`  
4. `sslmode=require` on cloud  
5. Connection pooling (HikariCP — Spring me already)  
6. Migrations tools later: Flyway / Liquibase (abhi Hibernate update chal raha hai)

### Level 3 — Later (advanced)

1. EXPLAIN ANALYZE (query performance)  
2. JSONB, full-text search  
3. Replication, read replicas  
4. Extensions (`pgvector` — Athena FAQ embeddings jaisa)

**Abhi migration ke liye Level 1 kaafi hai.**

---

## 5. Tumhare project me migration ka matlab

Codebase research (already done):

- Spring Data JPA + Hibernate entities → DB-agnostic ✅  
- No MySQL-only native queries in Java ✅  
- Changes already applied in repo:
  - `pom.xml` → PostgreSQL driver  
  - `application.properties` → Postgres URL + dialect + Hikari  
  - `Summary` pe `owner` index  

Matlab: **app ab Postgres dhoondhti hai**, MySQL nahi.

Agar tumhare paas **purane users/summaries MySQL me** hain, unhe **alag se copy** karna padega (pgloader / CSV).

---

## 6. Do alag kaam: code switch vs data copy

Yeh sabse important distinction hai — confuse mat hona.

### A) Code / config switch (already done in project)

```text
pom.xml driver  +  application.properties URL
        ↓
App boots → connects to Postgres → Hibernate creates empty tables
```

**Result:** App chal sakti hai, lekin **naya khali database**. Purane MySQL rows yahan nahi aate.

### B) Data migration (pgloader / export-import)

```text
MySQL (old rows)
      ↓  pgloader
PostgreSQL (same logical data)
      ↓
App login / summaries purane accounts se kaam kare
```

**Result:** Purana detail (users, summaries) Postgres me aa jata hai.

```text
┌─────────────────────┐     ┌──────────────────────┐
│  A) Code switch     │     │  B) Data copy        │
│  Driver + URL       │     │  pgloader / CSV      │
│  Empty DB OK        │     │  Keeps old rows      │
└─────────────────────┘     └──────────────────────┘
         Both needed if you care about OLD data
```

---

## 7. PostgreSQL install & first commands

### 7.1 Install (Ubuntu example)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl status postgresql
```

### 7.2 Enter `psql` as postgres user

```bash
sudo -u postgres psql
```

### 7.3 First commands (type inside psql)

```sql
-- list databases
\l

-- create database for Nexus backend
CREATE DATABASE summaries_db;

-- connect to it
\c summaries_db

-- later after migration / app start:
\dt                          -- list tables
SELECT COUNT(*) FROM app_user;
SELECT COUNT(*) FROM summary;

-- quit
\q
```

### 7.4 Optional: password for role `postgres`

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
```

`application.properties` default: username `postgres`, password `password` — local pe match karao ya env se override.

### Practice

- [ ] Postgres install  
- [ ] `CREATE DATABASE summaries_db`  
- [ ] `\l` me DB dikhe  

---

## 8. Spring Boot ko Postgres se kaise jodte ho

### 8.1 Properties (concept)

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/summaries_db
spring.datasource.username=postgres
spring.datasource.password=password
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
```

| Setting | Meaning |
|---------|---------|
| `url` | Kahan connect |
| `username` / `password` | Login to DB |
| `driver` | Java library that talks Postgres protocol |
| `dialect` | Hibernate SQL flavor (Postgres) |
| `ddl-auto=update` | Missing tables/columns auto-add (dev friendly; prod later use Flyway) |

### 8.2 Env override (better for secrets)

```bash
export DB_URL="jdbc:postgresql://localhost:5432/summaries_db"
export DB_USERNAME="postgres"
export DB_PASSWORD="password"
./mvnw spring-boot:run
```

### 8.3 Cloud URL example (Neon / Supabase)

```bash
export DB_URL="jdbc:postgresql://ep-xxxx.aws.neon.tech/neondb?sslmode=require"
export DB_USERNAME="..."
export DB_PASSWORD="..."
```

### Practice

- [ ] App start with Postgres  
- [ ] `/actuator/health` OK  
- [ ] Register one user → row in `app_user`  

---

## 9. pgloader kya hai aur kaise kaam karta hai

### 9.1 Simple definition

**pgloader** = tool jo **MySQL (source)** se padh kar **PostgreSQL (target)** me tables + data likhta hai.

```text
[MySQL :3306 / summaries_db]
           │
           │  pgloader reads tables & rows
           ▼
[PostgreSQL :5432 / summaries_db]
           │
           │  creates tables, copies data, fixes types where possible
           ▼
     Done (verify COUNT)
```

### 9.2 Ye kya map karta hai

| MySQL | Typical Postgres |
|-------|------------------|
| `INT` / `BIGINT` | `integer` / `bigint` |
| `VARCHAR(n)` | `varchar(n)` |
| `TEXT` | `text` |
| `TINYINT(1)` / `BIT` | often `boolean` (cast rules) |
| `AUTO_INCREMENT` | serial / identity + sequences |

### 9.3 Install pgloader

```bash
sudo apt install pgloader
pgloader --version
```

### 9.4 Mental model of a load file

Load file = “instructions” pgloader ko:

1. **FROM** MySQL URL  
2. **INTO** Postgres URL  
3. **WITH** options (create tables? drop? reset sequences?)  
4. **CAST** type conversions  
5. **INCLUDING** only certain tables  

---

## 10. Step-by-step: purana MySQL data Postgres me lao

> Tabhi chahiye jab MySQL me **important data** already hai.  
> Fresh project / empty DB → pgloader skip; sirf app chalao.

### Step 0 — Backup (safety)

```bash
# MySQL dump backup
mysqldump -u root -p summaries_db > mysql_backup_summaries.sql
```

### Step 1 — Confirm MySQL tables

```bash
mysql -u root -p -e "USE summaries_db; SHOW TABLES;"
```

Expect something like: `app_user`, `summary` (names confirm karo).

### Step 2 — Empty target Postgres DB

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS summaries_db;"
sudo -u postgres psql -c "CREATE DATABASE summaries_db;"
```

> Agar Postgres pe pehle empty Hibernate tables ban chuki hain aur tum **overwrite** chahte ho, drop/recreate cleanest hai.

### Step 3 — Create `migrate.load`

File path example: `backend/scripts/migrate.load`

```lisp
LOAD DATABASE
  FROM mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/summaries_db
  INTO postgresql://postgres:YOUR_PG_PASSWORD@localhost:5432/summaries_db

WITH include drop, create tables, create indexes, reset sequences,
     workers = 4, concurrency = 2

CAST type tinyint to boolean using tinyint-to-boolean,
     type datetime to timestamptz drop default drop not null using zero-dates-to-null,
     type date drop not null drop default using zero-dates-to-null

INCLUDING ONLY TABLE NAMES MATCHING ~/^(app_user|summary)$/
;
```

Passwords / table names apne hisaab se edit karo.

### Step 4 — Run pgloader

```bash
pgloader migrate.load
```

End me report dikhegi: tables, rows, errors.

### Step 5 — Verify counts

**MySQL:**

```bash
mysql -u root -p -e "SELECT COUNT(*) FROM summaries_db.app_user; SELECT COUNT(*) FROM summaries_db.summary;"
```

**Postgres:**

```bash
psql -U postgres -d summaries_db -c 'SELECT COUNT(*) FROM app_user;'
psql -U postgres -d summaries_db -c 'SELECT COUNT(*) FROM summary;'
```

Numbers match hone chahiye.

### Step 6 — Reset sequences (IDs)

Agar `reset sequences` WITH me tha, normally OK. Manual check:

```sql
SELECT setval(pg_get_serial_sequence('app_user','id'), (SELECT MAX(id) FROM app_user));
SELECT setval(pg_get_serial_sequence('summary','id'), (SELECT MAX(id) FROM summary));
```

Warna naya insert purane ID pe collide kar sakta hai.

### Step 7 — Start Spring Boot on Postgres

```bash
export DB_URL="jdbc:postgresql://localhost:5432/summaries_db"
export DB_USERNAME="postgres"
export DB_PASSWORD="YOUR_PG_PASSWORD"
./mvnw spring-boot:run
```

### Step 8 — App-level test

1. Login with an **old** MySQL user (same email/password — bcrypt hash copied).  
2. List summaries — purani entries dikhni chahiye.  
3. Create one new summary — ID conflict na aaye.

---

## 11. Verify + common errors

| Error / symptom | Meaning | Fix |
|-----------------|---------|-----|
| `Connection refused :5432` | Postgres not running | `sudo systemctl start postgresql` |
| `database "summaries_db" does not exist` | DB not created | `CREATE DATABASE summaries_db;` |
| `password authentication failed` | Wrong user/pass | `ALTER USER` / fix env |
| `FATAL: role "root" does not exist` | MySQL habit — Postgres default role often `postgres` | use `postgres` user |
| App still hits MySQL | Old `DB_URL` env | unset MySQL URL; set Postgres JDBC |
| Login fails after migrate | Data not copied / wrong DB | verify `COUNT(*)` + correct URL |
| `pinned` type errors | BIT → boolean | CAST / AFTER LOAD in pgloader |
| Duplicate key on insert | Sequence not reset | `setval` after migrate |
| `sslmode` errors on cloud | Need TLS | add `?sslmode=require` |

---

## 12. Practice checklist (tumhare liye)

### Concepts

- [ ] Main explain kar sakta hoon: server vs database vs table  
- [ ] Main farq bata sakta hoon: code switch vs data copy  
- [ ] Main JDBC URL padh sakta hoon  

### Hands-on Postgres

- [ ] Install + `psql` open  
- [ ] `CREATE DATABASE summaries_db`  
- [ ] Simple `CREATE TABLE` + `INSERT` + `SELECT` practice DB pe  

### Project

- [ ] App Postgres pe boot  
- [ ] New register user dikhta hai `app_user` me  
- [ ] (Optional) pgloader se old MySQL data copy + counts match  

### Learning notes (khud likho)

- [ ] 5 lines: “pgloader kya karta hai”  
- [ ] 5 lines: “Hikari pool kyun”  
- [ ] 5 lines: “ddl-auto=update ke risks production me”  

---

## 13. Glossary (shabdon ka matlab)

| Term | Simple meaning |
|------|----------------|
| **JDBC** | Java ka standard way DB se baat karne ka |
| **Driver** | Library jo specific DB protocol samajhti hai (postgres jar) |
| **Dialect** | Hibernate ko batata hai SQL kaunse style me likhe |
| **ORM / JPA / Hibernate** | Objects ↔ tables mapping; raw SQL kam likhte ho |
| **ddl-auto=update`** | App start pe schema sync (dev); prod me migrations better |
| **HikariCP** | Fast connection pool (reuse DB connections) |
| **pgloader** | MySQL → Postgres data migration tool |
| **Sequence** | Auto-increment ID generator in Postgres |
| **Dump** | Backup file of DB |
| **Schema** | Structure (tables/columns), not the row data |
| **SSL / sslmode** | Encrypted connection (cloud almost always) |

---

## 14. Next learning after this

1. **SQL joins + indexes** — real app queries  
2. **Flyway** — versioned migrations (replace blind `ddl-auto=update` in prod)  
3. **`pg_dump` weekly backup** habit  
4. **Explain plans** — slow query debugging  
5. Compare with **Athena Neon Postgres** — same skills  

---

## Quick “cheat sheet” (print / pin)

```bash
# Postgres shell
sudo -u postgres psql
CREATE DATABASE summaries_db;
\c summaries_db
\dt
\q

# App env
export DB_URL=jdbc:postgresql://localhost:5432/summaries_db
export DB_USERNAME=postgres
export DB_PASSWORD=password

# Data migrate (only if MySQL has old data)
sudo apt install pgloader
pgloader migrate.load

# Verify
psql -U postgres -d summaries_db -c 'SELECT COUNT(*) FROM app_user;'
```

---

## Final mental model (yaad rakhna)

```text
1. PostgreSQL = database engine (seekho: psql, SQL, ports)
2. Spring config  = app ko Postgres se jodna (driver + URL)
3. pgloader       = PURANA MySQL data uthana (optional but critical if data exists)
4. Verify         = COUNT + login + create new row
```

Bina (3) ke tum **naya khali** Postgres pe start karte ho — ye bhi valid hai agar purana data zaroori nahi.

---

> **Tip:** Roz 30–40 min: pehle `psql` practice, phir ek baar full boot, phir (agar chahiye) ek dry-run pgloader.  
> Jab ye guide ke checklist ticks ho jayein — tum migration confidently explain + perform kar sakte ho.

**Short ops doc:** [`MYSQL_TO_POSTGRES.md`](./MYSQL_TO_POSTGRES.md)  
**API testing:** [`Nexus_Backend_API_Testing.md`](./Nexus_Backend_API_Testing.md)
