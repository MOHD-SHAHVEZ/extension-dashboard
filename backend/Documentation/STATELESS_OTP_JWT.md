# Stateless OTP (JWT) — Extension Backend

Stack: **Java 17 + Spring Boot 3 + Auth0 java-jwt + Spring Mail**

| Related docs | |
|--------------|--|
| Full API contract | [`Nexus_Backend_APIs.md`](./Nexus_Backend_APIs.md) |
| Testing sheet (all APIs) | [`Nexus_Backend_API_Testing.md`](./Nexus_Backend_API_Testing.md) |

OTP state is **not** stored in DB, Redis, or an in-memory map.  
The client holds a signed `verification_token` (JWT) that carries the OTP hash and attempt count.

---

## JWT payload (`verification_token`)

| Claim | Meaning |
|-------|---------|
| `identifier` | Email or phone (normalized lowercase) |
| `otp_hash` | `HMAC-SHA256(otp, OTP_SALT)` hex |
| `purpose` | `signup` \| `login` \| `reset-password` \| `verify-email` |
| `attempts` | Failed verify count (max **5**) |
| `token_type` | Always `otp` (auth filter ignores it) |
| `iat` / `exp` | Issued at / expiry (**5 minutes**) |

Signed with **HS256** using `JWT_SECRET` (`app.jwt.secret`).

Plain OTP is **never** put in the JWT — only the HMAC hash.

---

## End-to-end flow

```text
1) Client POST /api/otp/send  { identifier, purpose }
2) Server:
   - generate 6-digit OTP (SecureRandom)
   - otp_hash = HMAC-SHA256(otp, OTP_SALT)
   - sign JWT → verification_token
   - sendOtpToUser(identifier, otp)  // email + console log
   - return { message, verification_token }   // no server store
3) Client shows OTP input; keeps verification_token in memory
4) Client POST /api/otp/verify  { verification_token, otp, purpose }
5) Server:
   - verify JWT signature + expiry
   - purpose must match
   - HMAC submitted otp → timing-safe compare to otp_hash
   - mismatch → attempts++ in a refreshed JWT (same exp), return new verification_token
   - attempts >= 5 → reject; client must /send again
   - match → { success: true }
```

**Signup (Nexus FE)** uses the same engine:

```text
POST /api/auth/register     → creates user + returns verification_token + emails OTP
POST /api/auth/verify-otp   → { verification_token, otp, purpose: "signup" } → auth JWT
POST /api/auth/resend-otp   → new verification_token
```

---

## Env / properties

| Variable | Property | Role |
|----------|----------|------|
| `JWT_SECRET` | `app.jwt.secret` | Sign auth JWT **and** OTP verification JWT |
| `OTP_SALT` | `app.otp.salt` | HMAC salt for `otp_hash` |
| `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD` | `spring.mail.*` | Optional real email |

If mail is not configured, OTP is still printed to the **server console**.

---

## Rate limit

In-memory IP filter (`OtpRateLimitFilter`): **20 req / 60s** on `/api/otp/**`, `/api/auth/register`, `/verify-otp`, `/resend-otp`.

---

## Example curl

```bash
BASE=http://localhost:8080

# 1) Send OTP
curl -s -X POST "$BASE/api/otp/send" \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"you@example.com","purpose":"signup"}'
# → { "message":"OTP sent", "verification_token":"<jwt>" }
# Check server logs for: [OTP DELIVERY] to=you@example.com otp=123456

# 2) Verify (replace TOKEN and OTP)
curl -s -X POST "$BASE/api/otp/verify" \
  -H 'Content-Type: application/json' \
  -d '{"verification_token":"TOKEN","otp":"123456","purpose":"signup"}'
# → { "success": true, "message": "OTP verified successfully" }

# Wrong OTP returns a NEW verification_token — use that for the next try:
# { "success": false, "error": "Incorrect OTP, try again", "verification_token": "..." }
```

### Signup path

```bash
# Register
curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"owner":{"firstName":"Alex","lastName":"M","email":"alex@example.com","password":"Password123"}}'
# → verification_token + email OTP

# Verify → session JWT
curl -s -X POST "$BASE/api/auth/verify-otp" \
  -H 'Content-Type: application/json' \
  -d '{"verification_token":"TOKEN","otp":"123456","purpose":"signup","email":"alex@example.com"}'
```

---

## Key files

| File | Role |
|------|------|
| `service/OtpService.java` | Generate / hash / sign / verify JWT OTP |
| `service/EmailService.java` | `sendOtpToUser` + optional SMTP |
| `controller/OtpController.java` | `/api/otp/send`, `/api/otp/verify` |
| `controller/AuthController.java` | Signup wired to JWT OTP |
| `config/OtpRateLimitFilter.java` | IP rate limit |
| `config/SecurityConfig.java` | Permits `/api/otp/**` |

---

## FE note

After `register` / `resend-otp` / wrong verify, **always replace** stored `verification_token` with the latest one from the response. Old tokens stay valid until expiry but `attempts` only advance on the token you submit.
