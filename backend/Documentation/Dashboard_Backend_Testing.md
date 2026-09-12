# Productivity Dashboard Backend — Testing Guide

| Field | Value |
|-------|-------|
| **Base URL** | `http://localhost:8080` |
| **Auth header** | `Authorization: Bearer <TOKEN>` |
| **Content-Type** | `application/json` |
| **Last updated** | 2026-09-11 |

This document is for a backend developer who needs to:

1. Understand **what we built and how it works** (theory + flow)
2. **Test every API** with a given input and expected response

Mark each case **Pass ☐** after verifying.

---

## 1. What we built (theory)

The React dashboard already had UI for login, todos, schedule, and AI summaries. Before this work:

- Auth + summaries were stored in PostgreSQL
- Tasks and schedule lived only in browser `localStorage`
- “Summarize URL” saved fake placeholder text

Now the backend is the source of truth for all four modules.

```
Browser / Chrome extension
        │  JWT Bearer
        ▼
Spring Boot 3 (port 8080)
  ├── JwtAuthFilter          (session JWT)
  ├── OtpRateLimitFilter     (20 req / 60s on OTP routes)
  ├── Controllers → Services → JPA Repositories
  └── @Async summarizationExecutor
        │
        ▼
PostgreSQL (Neon)
  app_user | task | schedule_slot | summary
```

### How each module works

**Auth (already existed, hardened)**  
Signup creates `ROLE_UNVERIFIED`. OTP is **not** stored in DB. It is hashed (HMAC) inside a 5-minute JWT called `verification_token`. After verify, role becomes `ROLE_USER` and a 24h session JWT is returned. Password is BCrypt. `/api/users/me` never returns the hash.

**Schedule**  
A slot is a template: `day_code = all` (every day) or `Mon`…`Sun` (one weekday). We do **not** explode recurring slots into 365 rows. Calendar views expand templates in memory.

**Tasks + history**  
Every task has `task_date`. Completing a task sets `done=true` and `completed_at`. Rows are **kept** so Monday last month can still be queried. When today’s dashboard/tasks are loaded, today’s matching schedule slots are copied into `task` once (`source_slot_id` + `sync_date` unique).

**AI summaries**  
`POST /api/summaries/from-url` inserts a row with `status=PROCESSING` and returns **202 immediately**. A background thread fetches the URL (Jsoup / YouTube oEmbed), optionally calls OpenAI if `OPENAI_API_KEY` is set, then writes `READY` or `FAILED`. Client polls `GET /api/summaries/{id}`.

**Caching**  
Caffeine cache (90s) on dashboard / schedule / summaries. Writes evict that user’s keys.

---

## 2. Database (what is new)

**Existing tables (kept):** `app_user`, `summary`

**New tables:** `task`, `schedule_slot`

**New columns on existing tables**

| Table | New columns |
|-------|-------------|
| `app_user` | `avatar_data_url`, `dark_mode`, `email_notifications`, `created_at`, `updated_at` |
| `summary` | `user_id`, `status`, `error_message`, `tags`, `updated_at` (`content` is now TEXT) |

Hibernate `ddl-auto=update` creates/alters these on boot. Reference SQL: `src/main/resources/db/dashboard-schema.sql`.

---

## 3. Setup before testing

| # | Check | Done |
|---|-------|------|
| 1 | App running on `8080` | ☐ |
| 2 | PostgreSQL reachable (`DB_URL`) | ☐ |
| 3 | Watch logs for `[OTP DELIVERY]` (OTP is printed if mail is optional) | ☐ |
| 4 | Optional: `OPENAI_API_KEY` for real LLM summaries | ☐ |

```bash
export BASE="http://localhost:8080"
export EMAIL="qa.dash.$(date +%s)@example.com"
export PASS="Password123"
export TOKEN=""
export VERIFICATION_TOKEN=""
export OTP=""
export TASK_ID=""
export SLOT_ID=""
export SUMMARY_ID=""
```

Public routes (no JWT): login, register, verify-otp, resend-otp, `/api/otp/**`, actuator.

Everything else needs:

```bash
-H "Authorization: Bearer $TOKEN"
```

---

## 4. Recommended test sequence

```text
A  Health
B  Signup (register → OTP → JWT)
C  Login
D  Profile
E  Schedule CRUD + today timeline
F  Tasks CRUD + schedule sync + history
G  Dashboard aggregate
H  Manual summary CRUD
I  Async AI from-url (poll until READY/FAILED)
J  Change password
K  Negative / security
```

---

## PHASE A — Health

### A1 — Liveness

**Given**

```bash
curl -s -o /dev/null -w "%{http_code}" "$BASE/actuator/health"
```

**Expected:** `200` and JSON containing `"status":"UP"`

**Pass** ☐

---

## PHASE B — Signup flow (how we did it)

```
POST /register
  → insert app_user role=ROLE_UNVERIFIED, BCrypt password
  → issue OTP JWT (otp_hash inside token, TTL 5 min)
  → email / console log 6-digit OTP
  → return verification_token

POST /verify-otp
  → hash incoming OTP, constant-time compare
  → upgrade ROLE_UNVERIFIED → ROLE_USER
  → return session JWT (sub=email, claim role)
```

Wrong OTP increments `attempts` inside a **new** verification JWT (max 5). Expired token → client must resend.

### B1 — Register

**Given**

```bash
curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{
    \"owner\": {
      \"firstName\": \"Alex\",
      \"lastName\": \"Morgan\",
      \"email\": \"$EMAIL\",
      \"password\": \"$PASS\"
    }
  }"
```

**Expected `201`**

```json
{
  "success": true,
  "message": "User registered successfully, OTP sent",
  "email": "qa.dash....@example.com",
  "verification_token": "<jwt>"
}
```

Copy OTP from logs. Save token:

```bash
export VERIFICATION_TOKEN='<paste>'
export OTP='<6 digits>'
```

**Pass** ☐

### B2 — Wrong OTP

**Given**

```bash
curl -s -X POST "$BASE/api/auth/verify-otp" \
  -H 'Content-Type: application/json' \
  -d "{
    \"verificationToken\": \"$VERIFICATION_TOKEN\",
    \"otp\": \"000000\",
    \"purpose\": \"signup\"
  }"
```

**Expected `400`**

```json
{
  "success": false,
  "error": "Incorrect OTP, try again",
  "verification_token": "<refreshed jwt — replace the old one>"
}
```

**Pass** ☐

### B3 — Correct OTP

**Given** (use latest `verification_token` after B2)

```bash
curl -s -X POST "$BASE/api/auth/verify-otp" \
  -H 'Content-Type: application/json' \
  -d "{
    \"verificationToken\": \"$VERIFICATION_TOKEN\",
    \"otp\": \"$OTP\",
    \"purpose\": \"signup\"
  }"
```

**Expected `200`**

```json
{
  "token": "<session jwt>",
  "email": "qa.dash....@example.com",
  "role": "ROLE_USER"
}
```

```bash
export TOKEN='<paste token>'
```

**Pass** ☐

### B4 — Duplicate register of verified user

**Given:** same `POST /api/auth/register` as B1 with the same email.

**Expected `409`**

```json
{ "error": "Username already exists" }
```

**Pass** ☐

---

## PHASE C — Login

### C1 — Unverified user cannot login

Create a **second** email, register, do **not** verify, then login.

**Expected `401`**

```json
{ "error": "Please verify your email first (sign up again to resend OTP)" }
```

**Pass** ☐

### C2 — Happy login

**Given**

```bash
curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
```

**Expected `200`** — same shape as B3 (`token`, `email`, `role`).

**Pass** ☐

### C3 — Bad password

**Expected `401`** `{ "error": "Invalid username or password" }`

**Pass** ☐

---

## PHASE D — Profile

### D1 — GET me (password must be absent)

**Given**

```bash
curl -s "$BASE/api/users/me" -H "Authorization: Bearer $TOKEN"
```

**Expected `200`**

```json
{
  "user": {
    "id": 1,
    "username": "qa.dash....@example.com",
    "role": "ROLE_USER",
    "firstName": "Alex",
    "lastName": "Morgan",
    "name": "Alex Morgan",
    "phone": null,
    "persona": null,
    "avatarDataUrl": null,
    "darkMode": false,
    "emailNotifications": true,
    "termsAcceptedAt": null,
    "termsVersion": null,
    "createdAt": "2026-09-11T11:00:00Z"
  },
  "profileCompleteness": { "isComplete": false },
  "username": "qa.dash....@example.com",
  "name": "Alex Morgan",
  "avatarDataUrl": "",
  "darkMode": false,
  "emailNotifications": true
}
```

**Must not contain** `"password"`.

**Pass** ☐

### D2 — PATCH me (signup step 4 + Settings)

**Given**

```bash
curl -s -X PATCH "$BASE/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "+919876543210",
    "persona": "professional",
    "acceptedTerms": true,
    "name": "Alex Morgan",
    "darkMode": false,
    "emailNotifications": true
  }'
```

**Expected `200`** — `message: "Profile updated successfully"`, `profileCompleteness.isComplete: true`.

**Pass** ☐

---

## PHASE E — Schedule

**How it works:** slot JSON uses frontend names (`time`, `endTime`, `desc`, `day`). DB columns are `start_time`, `end_time`, `description`, `day_code`.

`day`: `"all"` = every day; `"Mon"`…`"Sun"` = that weekday only.

### E1 — Create recurring slot

**Given**

```bash
curl -s -X POST "$BASE/api/schedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "time": "09:00 AM",
    "endTime": "10:30 AM",
    "title": "System Design",
    "desc": "Rate limiter + cache",
    "category": "work",
    "day": "all"
  }'
```

**Expected `201`**

```json
{
  "id": 1,
  "userId": 1,
  "time": "09:00 AM",
  "endTime": "10:30 AM",
  "title": "System Design",
  "desc": "Rate limiter + cache",
  "category": "work",
  "day": "all",
  "createdAt": "...",
  "updatedAt": "..."
}
```

```bash
export SLOT_ID=1
```

**Pass** ☐

### E2 — Create Monday-only slot

**Given**

```json
{
  "time": "03:00 PM",
  "endTime": "04:00 PM",
  "title": "Mock Interview",
  "desc": "STAR + coding",
  "category": "interview",
  "day": "Mon"
}
```

**Expected `201`**, `day: "Mon"`.

**Pass** ☐

### E3 — List all

```bash
curl -s "$BASE/api/schedule" -H "Authorization: Bearer $TOKEN"
```

**Expected `200`:** JSON **array**. Recurring + Monday slots both present.

**Pass** ☐

### E4 — Filter by day

```bash
curl -s "$BASE/api/schedule?day=Mon" -H "Authorization: Bearer $TOKEN"
```

**Expected:** slots where `day` is `Mon` **or** `all`.

**Pass** ☐

### E5 — Today timeline (status computed)

```bash
curl -s "$BASE/api/schedule/today" -H "Authorization: Bearer $TOKEN"
```

**Expected `200` array**, each item:

```json
{
  "id": 1,
  "time": "09:00 AM – 10:30 AM",
  "startTime": "09:00 AM",
  "endTime": "10:30 AM",
  "title": "System Design",
  "desc": "Rate limiter + cache",
  "category": "work",
  "day": "all",
  "status": "upcoming"
}
```

`status` is one of: `done` | `active` | `upcoming` | `focus` | `rest`  
(derived from clock vs start/end, plus category: interview → focus, health → rest).

**Pass** ☐

### E6 — Delete slot

```bash
curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$BASE/api/schedule/$SLOT_ID" -H "Authorization: Bearer $TOKEN"
```

**Expected:** `204`

**Pass** ☐

---

## PHASE F — Tasks (CRUD + history)

**How it works**

1. Manual task → `task_date` defaults to today (or body `taskDate`).
2. First list/history call that includes **today** copies matching schedule slots into tasks (`title` prefixed `[Schedule]`, `tag=Daily Goal`). Duplicate copy is blocked by unique `(user_id, source_slot_id, sync_date)`.
3. Toggle `done` does **not** delete the row. History stays.
4. `GET /api/tasks/history` returns completed vs remaining for a month / weekday / exact date.

### F1 — Create task for today

**Given**

```bash
curl -s -X POST "$BASE/api/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "2 LeetCode Mediums",
    "tag": "Daily",
    "time": "50m",
    "priority": "High",
    "done": false
  }'
```

**Expected `201`**

```json
{
  "id": 10,
  "userId": 1,
  "title": "2 LeetCode Mediums",
  "tag": "Daily",
  "time": "50m",
  "priority": "High",
  "done": false,
  "aiSynced": false,
  "sourceSlotId": null,
  "syncDate": null,
  "taskDate": "2026-09-11",
  "completedAt": null,
  "createdAt": "...",
  "weekday": "Thu",
  "effectiveDate": "2026-09-11"
}
```

(`weekday` / `effectiveDate` follow the machine’s local date.)

```bash
export TASK_ID=10
```

**Pass** ☐

### F2 — Create task on a past Monday (history)

**Given** (pick a real past Monday, example `2026-08-03`)

```json
{
  "title": "August Monday review",
  "tag": "Interview Prep",
  "time": "30m",
  "priority": "Medium",
  "done": true,
  "taskDate": "2026-08-03"
}
```

**Expected `201`:** `taskDate: "2026-08-03"`, `done: true`, `completedAt` not null, `weekday: "Mon"`.

**Pass** ☐

### F3 — Toggle done

**Given**

```bash
curl -s -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"done": true}'
```

**Expected `200`:** `done: true`, `completedAt` set.

Patch again `{"done": false}` → `completedAt: null`.

**Pass** ☐

### F4 — List today (dashboard queue)

```bash
curl -s "$BASE/api/tasks?scope=today" -H "Authorization: Bearer $TOKEN"
```

**Expected `200` array:** only tasks whose effective date is **today**. After E1, a `[Schedule] ...` row may appear.

**Pass** ☐

### F5 — History: last month Mondays

```bash
curl -s "$BASE/api/tasks/history?year=2026&month=8&day=Mon" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected `200`**

```json
{
  "from": "2026-08-01",
  "to": "2026-08-31",
  "weekday": "Mon",
  "total": 1,
  "completed": 1,
  "remaining": 0,
  "tasks": [ { "title": "August Monday review", "done": true, "weekday": "Mon" } ],
  "days": [
    { "date": "2026-08-03", "weekday": "Mon", "total": 1, "completed": 1, "remaining": 0 }
  ]
}
```

Assert F2 task is in `tasks`, and a **today** task is **not**.

**Pass** ☐

### F6 — History: this month (all days)

```bash
curl -s "$BASE/api/tasks/history?year=2026&month=9" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `from`/`to` span the month; `total = completed + remaining`.

**Pass** ☐

### F7 — History: exact date

```bash
curl -s "$BASE/api/tasks/history?date=2026-08-03" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `from` and `to` both `2026-08-03`.

**Pass** ☐

### F8 — Delete one task

```bash
curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$BASE/api/tasks/$TASK_ID" -H "Authorization: Bearer $TOKEN"
```

**Expected:** `204`

**Pass** ☐

### F9 — Clear completed **only in this view**

```bash
curl -s -X DELETE "$BASE/api/tasks/completed?from=2026-08-01&to=2026-08-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected `200`:** `{ "deleted": <n> }`  
August completed rows gone; September rows remain if you query history again.

Without `from`/`to`, **all** completed tasks for the user are deleted — avoid that in history tests.

**Pass** ☐

---

## PHASE G — Dashboard (one round-trip)

**How it works:** `GET /api/dashboard` loads today’s tasks (after schedule sync), today’s timeline with status, latest summaries, plus `focusTitle` / `nextLabel`. Cached ~90s; writes evict the cache.

**Given**

```bash
curl -s "$BASE/api/dashboard" -H "Authorization: Bearer $TOKEN"
```

**Expected `200`**

```json
{
  "tasks": [ ],
  "schedule": [ ],
  "summaries": [ ],
  "focusTitle": "Today's goals",
  "nextLabel": "Schedule clear for now"
}
```

After creating today’s slots/tasks/summaries, arrays are non-empty and labels match the live/next slot.

**Pass** ☐

---

## PHASE H — Manual summaries (CRUD)

### H1 — Create

**Given**

```bash
curl -s -X POST "$BASE/api/summaries" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Attention Is All You Need",
    "excerpt": "Transformer architecture notes",
    "content": "Self-attention replaces recurrence.",
    "sourceUrl": "https://example.com/paper"
  }'
```

**Expected `200`:** `owner` = your email, `status: "READY"`, `createdAt` = today’s date string (`YYYY-MM-DD`), `pinned: false`.

```bash
export SUMMARY_ID=<id>
```

**Pass** ☐

### H2 — List (pagination)

```bash
curl -s "$BASE/api/summaries?page=1&limit=10" -H "Authorization: Bearer $TOKEN"
```

**Expected `200`:** JSON **array** (not `{ items: [] }`). Max `limit` is 100.

**Pass** ☐

### H3 — Get / Update pin / Delete

```bash
curl -s "$BASE/api/summaries/$SUMMARY_ID" -H "Authorization: Bearer $TOKEN"
# PUT
curl -s -X PUT "$BASE/api/summaries/$SUMMARY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Attention paper","excerpt":"...","content":"...","pinned":true,"sourceUrl":"https://example.com/paper"}'
# DELETE
curl -s "$BASE/api/summaries/$SUMMARY_ID" -X DELETE -H "Authorization: Bearer $TOKEN"
```

GET → `200` object. PUT → `pinned: true`. DELETE → body `"deleted"`.

**Pass** ☐

---

## PHASE I — Async AI summarization

**How we did it (so HTTP does not timeout)**

```
POST /api/summaries/from-url { sourceUrl }
  → insert summary status=PROCESSING  (HTTP 202)
  → @Async thread:
       fetch URL → extract title/text
       if OPENAI_API_KEY set → LLM JSON summary
       else extractive bullets
  → update status READY or FAILED

Client: GET /api/summaries/{id} every 1.5s until READY | FAILED
```

### I1 — Enqueue

**Given** (use a simple public page)

```bash
curl -s -D - -X POST "$BASE/api/summaries/from-url" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"sourceUrl":"https://example.com"}'
```

**Expected `202`**

```json
{
  "id": 99,
  "title": "Summarizing example.com…",
  "excerpt": "AI is extracting and summarizing this page. Refresh in a moment.",
  "content": "",
  "sourceUrl": "https://example.com",
  "status": "PROCESSING",
  "owner": "qa.dash....@example.com"
}
```

```bash
export SUMMARY_ID=99
```

**Pass** ☐

### I2 — Poll until finished

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s "$BASE/api/summaries/$SUMMARY_ID" -H "Authorization: Bearer $TOKEN"
  echo
  sleep 2
done
```

**Expected within ~20s:** `status` becomes `"READY"` (excerpt/content filled, tags maybe `["Web"]`) **or** `"FAILED"` with `errorMessage`.

Bad URL (e.g. `https://this-host-does-not-exist.invalid`) → `FAILED`.

**Pass** ☐

---

## PHASE J — Change password

### J1 — Success

**Given**

```bash
curl -s -X POST "$BASE/api/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"currentPassword\":\"$PASS\",\"newPassword\":\"NewPass123\"}"
```

**Expected `200`**

```json
{ "success": true, "message": "Password changed successfully" }
```

Login with old password → `401`. Login with `NewPass123` → `200`.

**Pass** ☐

### J2 — Wrong current password

**Expected `401`** `{ "message": "Current password is incorrect" }`

**Pass** ☐

### J3 — No JWT

Call change-password **without** Authorization.

**Expected `401`** (this route is **not** public).

**Pass** ☐

---

## PHASE K — Security / isolation

| # | Case | Expected | Pass |
|---|------|----------|------|
| K1 | `GET /api/tasks` without token | `401` | ☐ |
| K2 | User A’s token on User B’s `DELETE /api/tasks/{id}` | `404` (not found for that user) | ☐ |
| K3 | User A `GET /api/summaries/{id}` of User B | `403` | ☐ |
| K4 | `POST /api/auth/register-defaults` (default config) | `403` Default user seeding is disabled | ☐ |
| K5 | Burst 21+ `POST /api/auth/register` from same IP in 60s | `429` `{ "success": false, "error": "Too many requests. Try again later." }` | ☐ |
| K6 | `GET /api/admin/stats` as `ROLE_USER` | `403` | ☐ |
| K7 | OTP verification JWT used as `Authorization: Bearer` | treated as unauthenticated (OTP tokens are ignored by filter) | ☐ |

### Admin stats (need `ROLE_ADMIN` token)

```bash
curl -s "$BASE/api/admin/stats" -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected `200`**

```json
{ "totalSummaries": 3, "totalUsers": 2, "today": 1 }
```

`today` = summaries whose `createdAt` string equals today’s `YYYY-MM-DD`.

**Pass** ☐

---

## 5. Error shape (frontend reads `message`)

Validation / `ResponseStatusException` bodies look like:

```json
{
  "success": false,
  "error": "title is required",
  "message": "title is required"
}
```

Use this when asserting 400s from task/schedule create with a blank title.

---

## 6. End-to-end “user story” (theory → what to click/call)

| User action | What backend does |
|-------------|-------------------|
| Sign up + enter OTP | Unverified user → OTP JWT → ROLE_USER + session JWT |
| Add a daily 9am slot | Row in `schedule_slot` with `day_code=all` |
| Open Dashboard | Sync today’s slots into `task`, return today’s tasks + timeline + recent summaries |
| Tick a task done | `done=true`, `completed_at=now`; row **stays** |
| Open Tasks → Last month → Mon | `GET /api/tasks/history?year=&month=&day=Mon` → completed vs leftover |
| Paste article URL | 202 PROCESSING → async fetch/summarize → poll READY |
| Change password in Settings | BCrypt update; next login uses new password |

---

## 7. Quick curl smoke (after TOKEN is set)

```bash
curl -s "$BASE/api/users/me" -H "Authorization: Bearer $TOKEN" | head
curl -s -X POST "$BASE/api/schedule" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"time":"06:00 AM","endTime":"07:00 AM","title":"Walk","desc":"","category":"health","day":"all"}'
curl -s "$BASE/api/tasks?scope=today" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/tasks/history?year=2026&month=9" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/dashboard" -H "Authorization: Bearer $TOKEN"
```

If these four return JSON (not 401), auth + new modules are wired.
