# Backend deploy: commit → GitHub → Render

Ye file sirf **backend** ke liye hai. Frontend (Vercel) baad mein alag deploy karna.

Folder structure:

```
extension-dashboard/
  backend/          ← Render ka Root Directory
    Dockerfile
    pom.xml
    src/
  Frontend/
```

---

## 0) Pehle ye ready rakho

- GitHub account
- Render account — [https://dashboard.render.com](https://dashboard.render.com)
- PostgreSQL URL (Neon / Supabase / Render Postgres)
- Apne API keys (Groq, Cloudinary, Gmail app password) — **inhe GitHub pe mat daalna**, Render Environment Variables mein daalna

Local pe Docker optional hai. Render khud image build karega.

---

## 1) Git repo banao (agar abhi nahi hai)

Project folder `extension-dashboard` mein:

```bash
cd /home/mohdshahvez/Desktop/My-Project/extension-dashboard
git init
```

Check karo ye files ignore ho rahi hain (`.gitignore` mein pehle se hain):

- `backend/target/`
- `Frontend/node_modules/`
- `Frontend/.env`
- `.env`

Secrets (`application.properties` ke andar default keys) GitHub pe mat treat karo as production secrets. Render pe **naye / apne** env vars set karna.

---

## 2) Commit

```bash
git add backend Dockerfile render.yaml DEPLOY-BACKEND-RENDER.md
git add backend/.dockerignore backend/src backend/pom.xml
git status
```

Pehla commit:

```bash
git commit -m "$(cat <<'EOF'
Prepare Spring Boot backend for Render Docker deploy.

EOF
)"
```

Poora project (frontend + backend) ek repo mein rakhna best hai. Tab:

```bash
git add .
git status
git commit -m "$(cat <<'EOF'
Add app sources and Render/Vercel deploy setup.

EOF
)"
```

---

## 3) GitHub pe repo banao aur push karo

1. GitHub → **New repository**
2. Name example: `extension-dashboard`
3. **Public** ya **Private** (dono Render pe chalenge)
4. README **mat** add karna agar local repo pehle se hai
5. Remote add karke push:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/extension-dashboard.git
git push -u origin main
```

Agar `origin` pehle se hai:

```bash
git remote -v
git push -u origin main
```

---

## 4) Render pe Web Service

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**
2. **Connect GitHub** (pehli baar GitHub authorize karna padega)
3. Apna `extension-dashboard` repo select karo
4. Settings:

| Field | Value |
| --- | --- |
| Name | `ai-summarizer-api` (kuch bhi) |
| Language / Runtime | **Docker** |
| Branch | `main` |
| **Root Directory** | `backend` |
| Dockerfile Path | `Dockerfile` (default) |
| Instance | Free / Starter |

5. **Health Check Path:** `/actuator/health`
6. Build command / start command **mat** likho — Docker `ENTRYPOINT` chalega

**Root Directory `backend` zaroori hai.** Warna Render ko `Dockerfile` nahi milega.

---

## 5) Environment variables (Render → Environment)

**Environment** tab mein ye add karo. Values apni rakho — yahan placeholders hain.

### Database

| Key | Example |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://HOST:5432/DBNAME?sslmode=require` |
| `DB_USERNAME` | aapka db user |
| `DB_PASSWORD` | aapka db password |

Neon: dashboard se connection string lo, usko JDBC format mein likho (`jdbc:postgresql://...`).  
`postgres://` (URI) mat daalna — Spring ko `jdbc:postgresql://` chahiye.

### Security

| Key | Notes |
| --- | --- |
| `JWT_SECRET` | lamba random string (32+ chars) |
| `OTP_SALT` | alag random string |

### CORS (frontend baad mein Vercel pe)

Abhi local + Vercel preview:

```
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://*.vercel.app
```

Vercel URL milne ke baad usko bhi add karna:

```
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app,https://*.vercel.app
```

### AI / files / mail

| Key | Notes |
| --- | --- |
| `GROQ_API_KEY` | Groq key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary |
| `CLOUDINARY_API_KEY` | Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary |
| `MAIL_USERNAME` | Gmail (optional, OTP email) |
| `MAIL_PASSWORD` | Gmail App Password (optional) |

`PORT` Render **khud** set karta hai. Manually mat add karo.

Save → service **Create / Deploy**.

---

## 6) Deploy ka wait

Pehla Docker build **8–15 min** le sakta hai (Maven download).

Logs mein success:

- `Started ...Application`
- Health green

Browser mein:

```
https://YOUR-SERVICE.onrender.com/actuator/health
```

Expected:

```json
{"status":"UP"}
```

Login test:

```
https://YOUR-SERVICE.onrender.com/api/auth/login
```

Ye POST API hai — browser pe 401/405 normal ho sakta hai. Health `UP` matlab server live hai.

---

## 7) Free plan note

Render Free instance **so jata hai** jab traffic nahi hota. Pehli request 30–60s late ho sakti hai. Ye normal hai.

---

## 8) Common errors

**Dockerfile not found**  
Root Directory `backend` nahi set.

**Build failed / Java version**  
`backend/Dockerfile` Java 17 use karta hai. Local pom bhi 17 hai — change mat karo.

**Database connection failed**  
`DB_URL` `jdbc:postgresql://` se start hona chahiye, `sslmode=require` Neon/Supabase pe lagao.

**CORS error (frontend se)**  
Vercel domain `CORS_ALLOWED_ORIGINS` mein nahi hai. Update karke Redeploy (env change ke baad service restart).

**App crash / out of memory**  
Free RAM tight hai. Dockerfile mein `MaxRAMPercentage=75` already set hai. Extra heavy jobs avoid karo.

**Health check fail**  
Path exactly `/actuator/health`. Security is endpoint ko already public rakhta hai.

---

## 9) Update kaise push karo

Code change ke baad:

```bash
git add .
git commit -m "Describe why you changed it"
git push origin main
```

Render `main` pe auto-deploy karega (agar Auto-Deploy on hai).

---

## Next

Backend URL milte hi Vercel pe frontend env:

```
VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com
```

Phir Render pe `CORS_ALLOWED_ORIGINS` mein apna Vercel URL add karna.
