# Nexus Extension Backend — API Testing Sheet

| Field | Value |
|-------|-------|
| **Base URL** | `http://localhost:8080` |
| **Auth** | `Authorization: Bearer <TOKEN>` after login / verify-otp |
| **OTP** | Stateless JWT — see [`STATELESS_OTP_JWT.md`](./STATELESS_OTP_JWT.md) |
| **API contract** | [`Nexus_Backend_APIs.md`](./Nexus_Backend_APIs.md) |
| **Last updated** | 2026-09-10 |

Mark each test **Pass ☐** after verifying.

---

## 0. Prerequisites

| # | Check | Done |
|---|-------|------|
| 1 | PostgreSQL up + DB `summaries_db` (or `DB_URL`) | ☐ |
| 2 | App running on `8080` | ☐ |
| 3 | `JWT_SECRET` / `OTP_SALT` set (or accept defaults for local) | ☐ |
| 4 | Watch server logs for `[OTP DELIVERY]` | ☐ |

```bash
export BASE="http://localhost:8080"
export EMAIL="qa.nexus.$(date +%s)@example.com"
export PASS="Password123"
export TOKEN=""
export VERIFICATION_TOKEN=""
export OTP=""
export SUMMARY_ID=""
```

---

## Test sequence

```text
A  OTP standalone (send / verify / wrong / purpose)
B  Auth signup (register → verify → resend)
C  Auth login + defaults
D  Profile (/users/me)
E  Summaries CRUD
F  Admin stats
G  Negative / security
```

---

## PHASE A — Stateless OTP

### A1 — Send OTP

**Given**

```bash
curl -s -X POST "$BASE/api/otp/send" \
  -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$EMAIL\",\"purpose\":\"signup\"}"
```

**Expected `200`**

```json
{
  "message": "OTP sent",
  "verification_token": "<jwt string>"
}
```

Server log contains `[OTP DELIVERY] to=<email> otp=<6 digits>`.

```bash
# Save token; copy OTP from logs into OTP=
export VERIFICATION_TOKEN='<paste jwt>'
export OTP='<paste 6 digits>'
```

**Pass** ☐

---

### A2 — Verify OTP success

**Given**

```bash
curl -s -X POST "$BASE/api/otp/verify" \
  -H 'Content-Type: application/json' \
  -d "{\"verification_token\":\"$VERIFICATION_TOKEN\",\"otp\":\"$OTP\",\"purpose\":\"signup\"}"
```

**Expected `200`**

```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Pass** ☐

---

### A3 — Wrong OTP → refreshed token

Send a **new** OTP first (A1), then:

```bash
curl -s -X POST "$BASE/api/otp/verify" \
  -H 'Content-Type: application/json' \
  -d "{\"verification_token\":\"$VERIFICATION_TOKEN\",\"otp\":\"000000\",\"purpose\":\"signup\"}"
```

**Expected `400`**

```json
{
  "success": false,
  "error": "Incorrect OTP, try again",
  "verification_token": "<new jwt>"
}
```

Replace `VERIFICATION_TOKEN` with the new value before retrying.

**Pass** ☐

---

### A4 — Purpose mismatch

```bash
curl -s -X POST "$BASE/api/otp/verify" \
  -H 'Content-Type: application/json' \
  -d "{\"verification_token\":\"$VERIFICATION_TOKEN\",\"otp\":\"$OTP\",\"purpose\":\"login\"}"
```

**Expected `400`** — purpose mismatch message (token was issued for `signup`).

**Pass** ☐

---

### A5 — Expired / garbage token

```bash
curl -s -X POST "$BASE/api/otp/verify" \
  -H 'Content-Type: application/json' \
  -d '{"verification_token":"not-a-jwt","otp":"123456","purpose":"signup"}'
```

**Expected `400`**

```json
{
  "success": false,
  "error": "OTP expired or invalid, please resend"
}
```

**Pass** ☐

---

### A6 — Missing fields on send

```bash
curl -s -X POST "$BASE/api/otp/send" \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"x@y.com"}'
```

**Expected `400`** — identifier and purpose required.

**Pass** ☐

---

## PHASE B — Signup auth flow

Use a **fresh** email each full run.

### B1 — Register

```bash
curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"owner\":{\"firstName\":\"Alex\",\"lastName\":\"QA\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}}"
```

**Expected `201`**

```json
{
  "success": true,
  "message": "User registered successfully, OTP sent",
  "email": "<email>",
  "verification_token": "<jwt>"
}
```

Save `verification_token` + OTP from logs.

**Pass** ☐

---

### B2 — Register duplicate

```bash
curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"owner\":{\"firstName\":\"Alex\",\"lastName\":\"QA\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}}"
```

**Expected `409`** — Username already exists.

**Pass** ☐

---

### B3 — Verify signup OTP → auth JWT

```bash
curl -s -X POST "$BASE/api/auth/verify-otp" \
  -H 'Content-Type: application/json' \
  -d "{\"verification_token\":\"$VERIFICATION_TOKEN\",\"otp\":\"$OTP\",\"purpose\":\"signup\",\"email\":\"$EMAIL\"}"
```

**Expected `200`**

```json
{
  "token": "<auth_jwt>",
  "username": "<email>",
  "role": "ROLE_USER"
}
```

```bash
export TOKEN='<paste auth jwt>'
```

**Pass** ☐

---

### B4 — Resend OTP

```bash
curl -s -X POST "$BASE/api/auth/resend-otp" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"purpose\":\"signup\"}"
```

**Expected `200`**

```json
{
  "success": true,
  "message": "OTP resent",
  "verification_token": "<new jwt>"
}
```

Old OTP must **not** work after you only use the new token + new OTP from logs.

**Pass** ☐

---

## PHASE C — Login & defaults

### C1 — Login success

```bash
curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$EMAIL\",\"password\":\"$PASS\"}"
```

**Expected `200`** — `token`, `username`, `role`.

**Pass** ☐

---

### C2 — Login wrong password

```bash
curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$EMAIL\",\"password\":\"wrong\"}"
```

**Expected `401`** — Invalid username or password.

**Pass** ☐

---

### C3 — Register defaults (optional)

```bash
curl -s -X POST "$BASE/api/auth/register-defaults"
```

**Expected `200`**. Then login `admin` / `admin`.

**Pass** ☐

---

## PHASE D — Profile

Requires `TOKEN` from B3 or C1.

### D1 — GET me

```bash
curl -s "$BASE/api/users/me" -H "Authorization: Bearer $TOKEN"
```

**Expected `200`** — `user` + `profileCompleteness.isComplete` (likely `false` before patch).

**Pass** ☐

---

### D2 — PATCH profile + terms

```bash
curl -s -X PATCH "$BASE/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919999999999","persona":"professional","acceptedTerms":true}'
```

**Expected `200`**

```json
{
  "message": "Profile updated successfully",
  "profileCompleteness": { "isComplete": true }
}
```

(`isComplete` true only if firstName + lastName already set from register.)

**Pass** ☐

---

### D3 — GET me without token

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/users/me"
```

**Expected** `401`.

**Pass** ☐

---

## PHASE E — Summaries

### E1 — Create

```bash
curl -s -X POST "$BASE/api/summaries" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test Summary","excerpt":"Short","content":"Full body","sourceUrl":"https://example.com","pinned":false}'
```

**Expected `200`** — object with `id`, `owner` = your email, `createdAt` set.

```bash
export SUMMARY_ID='<id>'
```

**Pass** ☐

---

### E2 — List

```bash
curl -s "$BASE/api/summaries" -H "Authorization: Bearer $TOKEN"
```

**Expected `200`** — JSON array including `SUMMARY_ID`.

**Pass** ☐

---

### E3 — Get by id

```bash
curl -s "$BASE/api/summaries/$SUMMARY_ID" -H "Authorization: Bearer $TOKEN"
```

**Expected `200`** — matching summary.

**Pass** ☐

---

### E4 — Update

```bash
curl -s -X PUT "$BASE/api/summaries/$SUMMARY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Updated Title","excerpt":"Short","content":"Updated","sourceUrl":"https://example.com","pinned":true}'
```

**Expected `200`** — `title` updated, `pinned: true`.

**Pass** ☐

---

### E5 — Delete

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "$BASE/api/summaries/$SUMMARY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected** success status (typically `200` / empty or confirmation per controller). Re-GET → `404`.

**Pass** ☐

---

### E6 — Create without auth

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/summaries" \
  -H 'Content-Type: application/json' \
  -d '{"title":"x"}'
```

**Expected** `401`.

**Pass** ☐

---

## PHASE F — Admin

### F1 — Stats as admin

```bash
# After register-defaults:
ADMIN_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' | jq -r .token)

curl -s "$BASE/api/admin/stats" -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected `200`**

```json
{
  "totalSummaries": <number>,
  "totalUsers": <number>,
  "today": <number>
}
```

**Pass** ☐

---

### F2 — Stats as normal user

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/admin/stats" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected** `403`.

**Pass** ☐

---

## PHASE G — Security / negatives

| # | Case | Call | Expected | Pass |
|---|------|------|----------|------|
| G1 | OTP token as Bearer on `/api/users/me` | `Authorization: Bearer <verification_token>` | `401` (not a session) | ☐ |
| G2 | Health | `GET /actuator/health` | `200` UP | ☐ |
| G3 | Rate limit | Burst >20 OTP sends from same IP in 60s | `429` | ☐ |
| G4 | 5 wrong OTP attempts | Verify wrong 5 times with refreshed tokens | `Too many attempts…` | ☐ |

---

## Sign-off

| Phase | Result |
|-------|--------|
| A OTP | ☐ Pass |
| B Signup | ☐ Pass |
| C Login | ☐ Pass |
| D Profile | ☐ Pass |
| E Summaries | ☐ Pass |
| F Admin | ☐ Pass |
| G Security | ☐ Pass |

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Build / branch | |
| Notes | |
