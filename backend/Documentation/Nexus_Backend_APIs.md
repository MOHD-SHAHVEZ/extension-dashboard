# Nexus Extension Backend — API Documentation

| Field | Value |
|-------|-------|
| **Document** | Backend API contract |
| **Stack** | Java 17 · Spring Boot 3 · JWT (Auth0) · **PostgreSQL** |
| **Base URL (local)** | `http://localhost:8080` |
| **Audience** | Frontend + QA |
| **Related** | [`STATELESS_OTP_JWT.md`](./STATELESS_OTP_JWT.md) · [`Nexus_Backend_API_Testing.md`](./Nexus_Backend_API_Testing.md) |
| **Last updated** | 2026-09-10 |

---

## 1. Conventions

### Auth

| Mode | Header |
|------|--------|
| Public | None (OTP / register / login) |
| Protected | `Authorization: Bearer <auth_jwt>` |

**Do not** send OTP `verification_token` as Bearer. It is a body field only (`token_type=otp`).

### Content type

```http
Content-Type: application/json
Accept: application/json
```

### Roles

| Role | Access |
|------|--------|
| `ROLE_USER` | Own profile, own summaries |
| `ROLE_ADMIN` | Admin stats + all summaries |

---

## 2. Endpoint index

| # | Method | Path | Auth | Purpose |
|---|--------|------|------|---------|
| 1 | `POST` | `/api/otp/send` | Public | Send OTP + return `verification_token` |
| 2 | `POST` | `/api/otp/verify` | Public | Verify OTP (stateless JWT) |
| 3 | `POST` | `/api/auth/register` | Public | Signup → user + OTP |
| 4 | `POST` | `/api/auth/verify-otp` | Public | Signup OTP → auth JWT |
| 5 | `POST` | `/api/auth/resend-otp` | Public | New OTP + new token |
| 6 | `POST` | `/api/auth/login` | Public | Password login → auth JWT |
| 7 | `POST` | `/api/auth/register-defaults` | Public | Seed admin/user (dev) |
| 8 | `GET` | `/api/users/me` | Bearer | Current profile |
| 9 | `PATCH` | `/api/users/me` | Bearer | Update phone / persona / terms |
| 10 | `GET` | `/api/summaries` | Bearer | List own summaries |
| 11 | `GET` | `/api/summaries/{id}` | Bearer | Get one (owner or admin) |
| 12 | `POST` | `/api/summaries` | Bearer | Create summary |
| 13 | `PUT` | `/api/summaries/{id}` | Bearer | Update summary |
| 14 | `DELETE` | `/api/summaries/{id}` | Bearer | Delete summary |
| 15 | `GET` | `/api/admin/stats` | Bearer + ADMIN | Platform counts |
| — | `GET` | `/actuator/health` | Public | Health |

Rate limit (IP, in-memory): **20 req / 60s** on OTP + register / verify-otp / resend-otp.

---

## 3. Stateless OTP

See full theory in [`STATELESS_OTP_JWT.md`](./STATELESS_OTP_JWT.md).

### JWT `verification_token` claims

```text
identifier   email/phone (lowercase)
otp_hash     HMAC-SHA256(otp, OTP_SALT) hex
purpose      signup | login | reset-password | verify-email
attempts     0..5
token_type   "otp"
iat / exp    5 minute TTL
```

Signed HS256 with `JWT_SECRET`. Plain OTP never stored server-side.

### 3.1 `POST /api/otp/send`

**Body**

```json
{
  "identifier": "alex@example.com",
  "purpose": "signup"
}
```

**Response `200`**

```json
{
  "message": "OTP sent",
  "verification_token": "<jwt>"
}
```

OTP is emailed (if mail configured) and always logged:

```text
[OTP DELIVERY] to=alex@example.com otp=123456
```

### 3.2 `POST /api/otp/verify`

**Body**

```json
{
  "verification_token": "<jwt>",
  "otp": "123456",
  "purpose": "signup"
}
```

| Result | Status | Body |
|--------|--------|------|
| Match | `200` | `{ "success": true, "message": "OTP verified successfully" }` |
| Wrong OTP | `400` | `{ "success": false, "error": "Incorrect OTP, try again", "verification_token": "<new jwt>" }` |
| Expired / bad JWT | `400` | `{ "success": false, "error": "OTP expired or invalid, please resend" }` |
| ≥ 5 attempts | `400` | `{ "success": false, "error": "Too many attempts, please request a new OTP" }` |
| Purpose mismatch | `400` | `{ "success": false, "error": "OTP purpose mismatch…" }` |

On wrong OTP, **replace** client-held token with the returned `verification_token`.

---

## 4. Auth

### 4.1 `POST /api/auth/register`

Creates user, issues signup OTP JWT, sends email.

**Body**

```json
{
  "owner": {
    "firstName": "Alex",
    "lastName": "Morgan",
    "email": "alex@example.com",
    "password": "Password123"
  }
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "User registered successfully, OTP sent",
  "email": "alex@example.com",
  "verification_token": "<jwt>"
}
```

**Errors:** `400` missing fields · `409` email exists

### 4.2 `POST /api/auth/verify-otp`

**Body**

```json
{
  "verification_token": "<jwt>",
  "otp": "123456",
  "purpose": "signup",
  "email": "alex@example.com"
}
```

`purpose` defaults to `signup` if omitted. `email` optional but must match token if sent.

**Response `200`**

```json
{
  "token": "<auth_jwt>",
  "username": "alex@example.com",
  "role": "ROLE_USER"
}
```

Store `token` as Bearer for protected APIs.

### 4.3 `POST /api/auth/resend-otp`

**Body**

```json
{ "email": "alex@example.com", "purpose": "signup" }
```

**Response `200`**

```json
{
  "success": true,
  "message": "OTP resent",
  "verification_token": "<new jwt>"
}
```

### 4.4 `POST /api/auth/login`

**Body**

```json
{ "username": "alex@example.com", "password": "Password123" }
```

**Response `200`** — same shape as verify-otp success (`token`, `username`, `role`).

**Errors:** `401` invalid credentials

### 4.5 `POST /api/auth/register-defaults`

Idempotent seed: `admin`/`admin` (`ROLE_ADMIN`), `user`/`user` (`ROLE_USER`).

---

## 5. Users (profile)

### 5.1 `GET /api/users/me`

**Response `200`**

```json
{
  "user": {
    "id": 1,
    "username": "alex@example.com",
    "role": "ROLE_USER",
    "firstName": "Alex",
    "lastName": "Morgan",
    "phone": null,
    "persona": null,
    "termsAcceptedAt": null,
    "termsVersion": null
  },
  "profileCompleteness": { "isComplete": false }
}
```

`isComplete` requires: `firstName`, `lastName`, `persona`, `termsAcceptedAt`.

### 5.2 `PATCH /api/users/me`

**Body** (any subset)

```json
{
  "phone": "+919999999999",
  "persona": "professional",
  "acceptedTerms": true
}
```

`persona`: `student` | `professional` | `freelancer` | `business`  
`acceptedTerms: true` → sets `termsAcceptedAt` + `termsVersion: "1.0"`.

**Response `200`**

```json
{
  "message": "Profile updated successfully",
  "profileCompleteness": { "isComplete": true }
}
```

---

## 6. Summaries

All require Bearer. Owner is set from JWT username.

### Summary object

```json
{
  "id": 1,
  "title": "Page title",
  "excerpt": "Short blurb",
  "content": "Full summary text",
  "sourceUrl": "https://example.com",
  "createdAt": "2026-09-10",
  "pinned": false,
  "owner": "alex@example.com"
}
```

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/summaries` | List for current user |
| `GET` | `/api/summaries/{id}` | Owner or ADMIN |
| `POST` | `/api/summaries` | Body without `owner` / `id` |
| `PUT` | `/api/summaries/{id}` | Owner or ADMIN |
| `DELETE` | `/api/summaries/{id}` | Owner or ADMIN |

---

## 7. Admin

### `GET /api/admin/stats`

Requires `ROLE_ADMIN`.

```json
{
  "totalSummaries": 10,
  "totalUsers": 5,
  "today": 2
}
```

---

## 8. Env checklist

| Env | Property | Required |
|-----|----------|----------|
| `JWT_SECRET` | `app.jwt.secret` | Prod yes |
| `OTP_SALT` | `app.otp.salt` | Prod yes |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | datasource | Yes |
| `MAIL_*` | `spring.mail.*` | Optional (console OTP fallback) |
| `CORS_ALLOWED_ORIGINS` | `app.cors.allowed-origins` | FE origins |
| `PORT` | `server.port` | Default `8080` |

---

## 9. Recommended FE signup sequence

```text
1. POST /api/auth/register          → save verification_token
2. User enters OTP from email/console
3. POST /api/auth/verify-otp        → save auth token
4. PATCH /api/users/me              → phone, persona, acceptedTerms
5. GET  /api/users/me               → profileCompleteness.isComplete
6. Dashboard
```

Google OAuth is **not** implemented on this backend yet (FE may still show the button as coming soon).
