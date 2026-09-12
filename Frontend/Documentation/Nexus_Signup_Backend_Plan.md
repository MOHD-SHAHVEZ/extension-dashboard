# Nexus Signup — Backend Alignment Plan (Athena)

| Field | Value |
|-------|-------|
| **Audience** | Frontend + Backend |
| **Frontend** | `extension-dashboard/Frontend` (Nexus multi-step signup) |
| **Backend** | Athena `Chatbot_Backend` (`/api/v2`) |
| **Strategy** | Reuse existing auth; extend profile/terms — do **not** rewrite signup |
| **Last updated** | 2026-09-10 |

---

## 1. Frontend flow (current UI)

```text
A. Get started          → Continue with Google  |  Sign up with email
1. Account              → firstName, lastName, email, password
2. Verification         → 6-digit OTP
3. Profile              → phone + persona (student / professional / freelancer / business)
4. Confirm              → accept Terms
   Success              → Dashboard
```

Google path skips OTP; after OAuth, Profile + Terms still apply if incomplete.

---

## 2. FE step → Backend map

| FE screen | Backend today | Action |
|-----------|---------------|--------|
| **A · Get started** | FE-only choice | No new API |
| **Google** | `GET /oauth/google/login` → callback → cookies → `FRONTEND_URL?oauth=success` | Wire FE button |
| **1 · Account** | `POST /auth/register` | Align payload (`owner.*`) |
| **2 · Verification** | `POST /auth/verify-otp` + `POST /auth/resend-otp` | Wire real APIs (FE currently mocked) |
| **3 · Profile** | Partial (`PATCH /organizations/me` for phone) | Add **persona**; keep phone on org |
| **4 · Confirm** | Missing | Add **termsAcceptedAt** |
| **Success** | Tokens after verify / OAuth cookies | FE session + completeness gate |

---

## 3. Reuse as-is (no rewrite)

| Method | Path | Role in signup |
|--------|------|----------------|
| `POST` | `/auth/register` | Start email signup → `PendingSignup` + send OTP |
| `POST` | `/auth/resend-otp` | Resend OTP |
| `POST` | `/auth/send-verification-otp` | Alias / resend |
| `POST` | `/auth/verify-otp` | Create Org + User + FREE plan + JWT (+ cookies) |
| `GET` | `/oauth/google/login` | Start Google OAuth |
| `GET` | `/oauth/google/callback` | Finish Google → cookies → redirect FE |
| `GET` | `/user/me` | User + org + `profileCompleteness` |
| `PATCH` | `/user/me` | Update name (extend for persona + terms) |
| `PATCH` | `/organizations/me` | Update `phone`, org `name`, `timezone` |

Base URL (local): `http://localhost:5000/api/v2`

---

## 4. Recommended sequence (Option A — minimal)

Issue tokens at OTP verify (current backend). Profile + Terms run **authenticated**.

### Email path

```text
FE: Choose → Sign up with email
  → POST /auth/register
       body: { owner: { firstName, lastName, email, password } }
  → POST /auth/verify-otp
       body: { email, otp }
       → tokens + cookies; account exists
  → PATCH /organizations/me
       body: { phone }
  → PATCH /user/me
       body: { persona, acceptedTerms: true }
  → GET /user/me
       → profileCompleteness.isComplete
  → Dashboard
```

### Google path

```text
FE: Continue with Google
  → window.location = {API}/oauth/google/login
  → Google → /oauth/google/callback
  → redirect FRONTEND_URL?oauth=success (HttpOnly cookies set)
  → GET /user/me
  → if needsSetup / missing terms → Profile + Confirm
  → Dashboard
```

**Do not use Option B** (delay user creation until Confirm) unless product explicitly requires it — larger `auth.service` change.

---

## 5. Create vs modify checklist

| # | Work | Type | Notes |
|---|------|------|-------|
| 1 | Wire FE Account + OTP to real auth APIs | **FE** | Replace mock `setTimeout` verify |
| 2 | Register payload = nested `owner` | **FE** (+ docs) | Backend already expects this |
| 3 | `User.persona` column + migration | **Backend create** | Not RBAC `User.role` |
| 4 | `PATCH /user/me` accept `persona` | **Backend modify** | Enum/string: student, professional, freelancer, business |
| 5 | `User.termsAcceptedAt` (+ optional `termsVersion`) | **Backend create** | |
| 6 | `PATCH /user/me` with `acceptedTerms: true` | **Backend modify** | Server sets timestamp |
| 7 | Extend `profileCompleteness` | **Backend modify** | phone, persona?, terms? |
| 8 | Google button → OAuth URL | **FE** | Replace “coming soon” alert |
| 9 | Post-oauth setup gate | **FE** | Same Profile + Confirm screens |
| 10 | Contract / Swagger note | **Docs** | |

### Explicitly out of scope

- New `/auth/signup/step-*` routes  
- Overloading `User.role` (`USER` \| `SUPER_ADMIN`) with FE persona  
- Forcing Google users through OTP  
- Stripe / payment in signup  

---

## 6. Schema changes (backend)

### 6.1 Persona (FE “role” on Profile step)

FE labels: Student, Professional, Freelancer, Business Owner.

```prisma
// on User — NEW (name must NOT be `role`)
persona  String?  @db.VarChar(32)  // student | professional | freelancer | business
```

Or a Prisma enum `UserPersona` with the same values.

**Important:** `User.role` stays platform RBAC only (`USER` \| `SUPER_ADMIN`). Always `USER` at signup.

### 6.2 Terms (Confirm step)

```prisma
// on User — NEW
termsAcceptedAt   DateTime?  @map("terms_accepted_at")
termsVersion      String?    @map("terms_version") @db.VarChar(32)
```

### 6.3 Phone

Already exists: `Organization.phone`, `PendingSignup.phone`.  
**No** user-level phone required for this FE.

---

## 7. API contracts FE should call

### 7.1 Register (Account step)

```http
POST /api/v2/auth/register
Content-Type: application/json

{
  "owner": {
    "firstName": "Alex",
    "lastName": "Morgan",
    "email": "alex.morgan@company.com",
    "password": "********"
  }
}
```

Success: `{ success: true, data: { email, otpResent } }` — **no tokens yet**.

### 7.2 Verify OTP

```http
POST /api/v2/auth/verify-otp
Content-Type: application/json

{ "email": "alex.morgan@company.com", "otp": "123456" }
```

Success **201**: `{ user, organization, tokens }` + HttpOnly cookies.

### 7.3 Resend OTP

```http
POST /api/v2/auth/resend-otp
{ "email": "alex.morgan@company.com" }
```

### 7.4 Profile — phone

```http
PATCH /api/v2/organizations/me
Authorization: Bearer <accessToken>

{ "phone": "+1..." }
```

### 7.5 Profile — persona + terms (after backend ships)

```http
PATCH /api/v2/user/me
Authorization: Bearer <accessToken>

{
  "persona": "professional",
  "acceptedTerms": true
}
```

### 7.6 Completeness check

```http
GET /api/v2/user/me
```

Use `data.profileCompleteness.isComplete` / `needsSetup` / `missing[]` to gate dashboard.

### 7.7 Google

```text
GET /api/v2/oauth/google/login
```

Full browser redirect (not XHR). Handle `?oauth=success` or `?oauth_error=...` on return.

---

## 8. profileCompleteness (target)

Today required:

- `user.firstName`, `user.lastName`
- real `organization.name` (not placeholder)
- `organization.phone`
- `organization.timezone`

**Proposed after this plan:**

| Field | Required for complete? |
|-------|-------------------------|
| Existing name / org name / phone / timezone | Yes (keep) |
| `user.persona` | Yes (new) |
| `user.termsAcceptedAt` | Yes (new) — or separate gate |

Logo / profile image remain optional.

---

## 9. Implementation order

1. **FE:** Wire register + verify + resend (unblocks real email signup).  
2. **FE:** Profile phone → `PATCH /organizations/me`.  
3. **BE:** Migration `persona` + `termsAcceptedAt` (+ optional `termsVersion`).  
4. **BE:** `PATCH /user/me` + completeness update.  
5. **FE:** Persona + terms → `PATCH /user/me`; gate dashboard.  
6. **FE:** Google → `/oauth/google/login` + post-oauth setup.

---

## 10. Backend file touch list (when implementing)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `persona`, `termsAcceptedAt`, `termsVersion` |
| New migration under `prisma/migrations/` | Apply columns |
| `src/modules/users/user.validation.js` | Allow `persona`, `acceptedTerms` |
| `src/modules/users/user.service.js` / mapper | Persist + return fields |
| `src/modules/users/profile.completeness.js` | Require persona + terms |
| Auth register/verify | **No structural change** for Option A |
| OAuth | **No change** for Option A |

---

## 11. Decision summary

| Question | Answer |
|----------|--------|
| New signup microservice? | **No** |
| When are tokens issued? | At **OTP verify** (and Google callback) |
| FE “role” field? | Store as **`persona`**, never as `User.role` |
| Phone? | **`Organization.phone`** |
| Terms? | **`User.termsAcceptedAt`** via `acceptedTerms: true` |
| Google OTP? | **Skipped** |

---

> **Next:** Backend implements schema + `PATCH /user/me` when product says go. Frontend can wire Account + OTP to existing auth immediately.
