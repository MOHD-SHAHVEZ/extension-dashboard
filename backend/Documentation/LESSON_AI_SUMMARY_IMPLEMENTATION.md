# Lesson AI Summary — Complete Implementation

| Field | Value |
|-------|-------|
| **Module** | Notebook lesson summaries (Spring AI) |
| **Package** | `com.gaur.backend` — isolated from URL `/api/summaries` |
| **Stack** | Spring Boot 3.5.7 · Java 17 · Spring AI 1.1.8 · OpenAI Chat · PostgreSQL |
| **Frontend** | React / Vite — `NotebookDetail.jsx` only (not Summaries page) |
| **Last updated** | 2026-09-12 |

This module is **separate** from the existing URL summarizer (`AiSummarizationService` + `Summary` table + `/api/summaries`). Do not merge tables, services, or UI.

Related docs:

- [SPRING_AI_COMPLETE_GUIDE.md](./SPRING_AI_COMPLETE_GUIDE.md) — Spring AI from basics to what this project uses
- [SPRING_AI_FLOW_AND_WORKING.md](./SPRING_AI_FLOW_AND_WORKING.md) — request-to-model flow you can explain later

---

## 1. What the user can do

Inside a **notebook lesson**:

1. Write / save the lesson.
2. Click **Summarize lesson**.
3. Backend sends the **saved** lesson text to OpenAI through **Spring AI `ChatClient`**.
4. A **DRAFT** row is stored. The UI shows a preview modal.
5. If the user likes it, they click **Save this summary** → status becomes `SAVED`.
6. Saved summaries appear under that lesson. They can reopen or delete them.

If the user closes the preview without saving, the draft stays in the database but is **not listed**. Listing is saved-only.

---

## 2. Keys and models you must set

Spring AI talks to OpenAI. Without a key, generate returns **503** and the rest of the app still boots.

### Required

| Variable | Example | Where |
|----------|---------|--------|
| `OPENAI_API_KEY` | `sk-proj-...` | OS env, IDE run config, or Render env |

Get a key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys). You also need billing enabled on the OpenAI account.

Local:

```bash
export OPENAI_API_KEY=sk-...
```

Then **restart** the Spring Boot process. Java does not pick up env changes on an already-running JVM.

The same `OPENAI_API_KEY` is reused by the **legacy** URL summarizer (`app.ai.openai-api-key`). That path does **not** use Spring AI.

### Optional (defaults are already set)

| Variable | Default | Meaning |
|----------|---------|---------|
| `SPRING_AI_OPENAI_MODEL` | `gpt-4o-mini` | Chat model for lesson summaries |
| `OPENAI_MODEL` | `gpt-4o-mini` | Fallback if `SPRING_AI_OPENAI_MODEL` is unset (also used by URL summaries) |
| `SPRING_AI_TEMPERATURE` | `0.3` | Lower = more faithful rewrite, less creativity |
| `SPRING_AI_MAX_TOKENS` | `1200` | Max completion tokens for the structured notes |

### Model we use and why

**`gpt-4o-mini`** is the project default.

| Why this model | Detail |
|----------------|--------|
| Cost | Cheap enough for student revision notes |
| Quality | Good structured JSON / markdown |
| Latency | Usually a few seconds for a typical lesson |
| Spring AI | Supported by `spring-ai-starter-model-openai` |

You can switch without code changes:

```bash
export SPRING_AI_OPENAI_MODEL=gpt-4o
```

Other compatible OpenAI chat models: `gpt-4.1-mini`, `gpt-4o`. Stay on a chat-completions model, not embeddings / image / whisper.

### Properties mapping (`application.properties`)

```properties
# Legacy URL summaries (HttpClient) — not this module
app.ai.openai-api-key=${OPENAI_API_KEY:}
app.ai.openai-model=${OPENAI_MODEL:gpt-4o-mini}

# Spring AI — lesson notebook summaries
spring.ai.openai.api-key=${OPENAI_API_KEY:}
spring.ai.openai.chat.options.model=${SPRING_AI_OPENAI_MODEL:${OPENAI_MODEL:gpt-4o-mini}}
spring.ai.openai.chat.options.temperature=${SPRING_AI_TEMPERATURE:0.3}
spring.ai.openai.chat.options.max-tokens=${SPRING_AI_MAX_TOKENS:1200}
```

Spring AI 1.1.8 refuses an empty key while creating unused speech/image beans. This project:

- sets `spring.ai.model.chat=openai` and the other model types to `none`
- uses placeholder `not-configured` when `OPENAI_API_KEY` is missing so the JVM can start
- generate still returns **503** until a real `sk-...` key is exported and the backend is restarted

---

## 3. Why this module is separate

| Concern | URL Summaries (`/api/summaries`) | Lesson AI summaries |
|---------|----------------------------------|---------------------|
| Source | Web page URL + Jsoup extract | Saved `lesson_note.content` |
| Client | Raw `HttpClient` to OpenAI | **Spring AI `ChatClient`** |
| Table | `summary` | `lesson_ai_summary` |
| UX | Dashboard / Summaries pages | Notebook lesson editor only |
| Persist | Saved immediately | Generate = draft, user chooses Save |
| Owner | JWT user | Same, plus `lesson_id` + `notebook_id` |

Do not call `AiSummarizationService` from this module.

---

## 4. Architecture

```
NotebookDetail.jsx
        │  JWT Bearer
        ▼
LessonAiSummaryController
        │
        ▼
LessonAiSummaryService
        ├── LessonNoteService.requireOwnedLesson  (404 if missing / other owner)
        ├── SpringAiLessonSummarizer              (ChatClient + structured output)
        └── LessonAiSummaryRepository
                    │
                    ▼
            lesson_ai_summary (PostgreSQL)
```

Packages:

| Class | Role |
|-------|------|
| `controller.LessonAiSummaryController` | HTTP API |
| `service.LessonAiSummaryService` | Ownership, draft/save, mapping |
| `ai.SpringAiLessonSummarizer` | Only Spring AI adapter |
| `ai.GeneratedLessonNotes` | Structured output record |
| `model.LessonAiSummary` | JPA entity |
| `repository.LessonAiSummaryRepository` | Owner-scoped queries |
| `dto.LessonAiSummaryResponse` | JSON out |

---

## 5. Database

Hibernate `ddl-auto=update` creates `lesson_ai_summary` on first start after this module. The same DDL is in `src/main/resources/db/dashboard-schema.sql`.

```sql
CREATE TABLE IF NOT EXISTS lesson_ai_summary (
    id            BIGSERIAL PRIMARY KEY,
    lesson_id     BIGINT       NOT NULL,
    notebook_id   BIGINT       NOT NULL,
    owner         VARCHAR(255) NOT NULL,
    lesson_title  VARCHAR(200),
    title         VARCHAR(255),
    excerpt       VARCHAR(2000),
    content       TEXT,
    model_used    VARCHAR(64),
    status        VARCHAR(16)  NOT NULL,
    saved         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);
```

| Column | Meaning |
|--------|---------|
| `lesson_id` | Source lesson (no FK — lesson delete does not cascade; row is historical) |
| `notebook_id` | Copied at generate time for later filtering |
| `owner` | JWT subject (email). Every lookup is `id + owner` |
| `title` / `excerpt` / `content` | Model output |
| `model_used` | e.g. `gpt-4o-mini` |
| `status` | `DRAFT` after generate, `SAVED` after save, reserved `FAILED` |
| `saved` | List filter. `true` only after explicit save |

No JPA `@Lob` on `content` (TEXT, not OID) — same rule as `LessonNote`.

---

## 6. API contract

All routes need `Authorization: Bearer <auth_jwt>`. Unauthenticated → **401**. Other user's id → **404** (`Lesson AI summary not found` / `Lesson not found`). Same message on purpose.

### 6.1 Generate (creates DRAFT)

```http
POST /api/lessons/{lessonId}/ai-summaries/generate
```

| Status | When |
|--------|------|
| 201 | Draft created |
| 400 | Lesson body empty |
| 404 | Lesson missing or not yours |
| 503 | `OPENAI_API_KEY` missing or `ChatClient` missing |
| 502 | OpenAI / Spring AI call failed |

Response body: `LessonAiSummaryResponse` with `saved: false`, `status: "DRAFT"`.

Generate always uses **database** lesson content, not unsaved editor text. The UI saves first if the editor is dirty.

Long lessons are truncated to **12_000 characters** before the prompt (`SpringAiLessonSummarizer.MAX_SOURCE_CHARS`).

### 6.2 List saved only

```http
GET /api/lessons/{lessonId}/ai-summaries
```

Returns `[]` if none. Drafts are hidden. Newest first.

### 6.3 Promote draft → saved

```http
POST /api/lesson-ai-summaries/{id}/save
```

Sets `saved=true`, `status=SAVED`. Saving an already-saved row is idempotent.

### 6.4 Get one (draft or saved)

```http
GET /api/lesson-ai-summaries/{id}
```

Owner can reopen a draft by id even if it is not in the list.

### 6.5 Delete

```http
DELETE /api/lesson-ai-summaries/{id}
```

204. Works for draft or saved.

### Response shape

```json
{
  "id": 12,
  "lessonId": 4,
  "notebookId": 2,
  "lessonTitle": "Photosynthesis",
  "title": "Photosynthesis — revision notes",
  "excerpt": "Plants convert light into chemical energy…",
  "content": "## Key points\n- ...",
  "modelUsed": "gpt-4o-mini",
  "status": "DRAFT",
  "saved": false,
  "createdAt": "2026-09-12T12:00:00",
  "updatedAt": "2026-09-12T12:00:00"
}
```

---

## 7. Spring AI call (what actually runs)

`SpringAiLessonSummarizer.summarize(title, content)`:

1. Reject blank API key → 503.
2. Resolve `ChatClient.Builder` from `ObjectProvider` (auto-configured by the OpenAI starter).
3. Truncate source if needed.
4. Build a **plain string** user message (not `{placeholders}`). Lesson markdown often contains `{` `}` which would break Spring AI `PromptTemplate`.
5. `chatClient.prompt().system(...).user(...).call().entity(GeneratedLessonNotes.class)`.
6. Spring AI `BeanOutputConverter` asks the model for JSON matching the record and maps it.

```java
public record GeneratedLessonNotes(
    String title,
    String excerpt,
    String markdown
) {}
```

Service then copies `markdown` → `content`, stores `modelUsed`, `DRAFT`, `saved=false`.

System prompt rules: revision notes only, no invented facts, structured fields only.

---

## 8. Frontend

Files:

- `Frontend/src/services/api.js` — five new functions, **not** `createSummary` / `/api/summaries`
- `Frontend/src/pages/NotebookDetail.jsx`

Flow:

1. Open lesson → `GET /api/lessons/{id}/ai-summaries` for the saved list.
2. **Summarize lesson** → if editor dirty, `PUT` lesson first → `POST .../generate`.
3. Modal shows draft markdown (`ReactMarkdown`).
4. **Save this summary** → `POST /api/lesson-ai-summaries/{id}/save`.
5. List refreshes. Click a card to reopen. Delete confirms then `DELETE`.

Empty lesson → toast, no API call (backend also returns 400).

---

## 9. Security

| Rule | How |
|------|-----|
| JWT required | `SecurityConfig` — `/api/**` authenticated except auth/otp |
| Owner on every query | `findByIdAndOwner`, `requireOwnedLesson` |
| No cross-user leak | Missing and other-owner both 404 |
| No prompt injection via template | User text is concatenated, not `{param}` interpolated |
| Key not in git | Env only. Do not commit `sk-` keys |

---

## 10. How this differs from a “just call OpenAI” service

The old URL path builds an HTTP request by hand. This module:

- Lets Spring AI own HTTP, retries (starter defaults), and JSON schema conversion
- Uses `ChatClient` so later you can add advisors, memory, or swap providers with less glue
- Still keeps a thin adapter (`SpringAiLessonSummarizer`) so the service layer stays JPA/HTTP-clean

See the two Spring AI docs for the full picture.

---

## 11. Local run / verify

1. Export `OPENAI_API_KEY`.
2. Restart backend (this project has no DevTools — old JVM will not see new classes).
3. Login → My Notebooks → open a notebook → write a lesson → Save.
4. **Summarize lesson** → wait → preview → **Save this summary**.
5. Reload the lesson: saved card should still be there.

Without a key, generate should return 503 with:  
`OPENAI_API_KEY is not set. Add it to the environment and restart the backend.`

Unauthenticated curl:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:8080/api/lessons/1/ai-summaries/generate
# 401
```

---

## 12. File index

### Backend

- `pom.xml` — `spring-ai-bom` 1.1.8 + `spring-ai-starter-model-openai`
- `application.properties` — `spring.ai.openai.*`
- `src/main/java/com/gaur/backend/ai/GeneratedLessonNotes.java`
- `src/main/java/com/gaur/backend/ai/SpringAiLessonSummarizer.java`
- `src/main/java/com/gaur/backend/model/LessonAiSummary.java`
- `src/main/java/com/gaur/backend/repository/LessonAiSummaryRepository.java`
- `src/main/java/com/gaur/backend/dto/LessonAiSummaryResponse.java`
- `src/main/java/com/gaur/backend/service/LessonAiSummaryService.java`
- `src/main/java/com/gaur/backend/controller/LessonAiSummaryController.java`
- `src/main/resources/db/dashboard-schema.sql`

### Frontend

- `Frontend/src/services/api.js`
- `Frontend/src/pages/NotebookDetail.jsx`

---

## 13. Failure modes

| Symptom | Cause | Fix |
|---------|--------|-----|
| 503 on generate | No `OPENAI_API_KEY` in the **running** process | Export + restart |
| 502 | Quota, invalid key, network, model name | Check OpenAI dashboard + `SPRING_AI_OPENAI_MODEL` |
| 400 empty content | Lesson not written / not saved | Save lesson first |
| 401 | Missing/expired JWT | Login again |
| 404 | Wrong id or not owner | Use your lesson / summary id |
| App did not pick up Java changes | Old `spring-boot:run` still alive | Stop PID on :8080, start again |
| Maven cannot resolve Spring AI | First download of 1.1.8 | Network + `mvn -U compile` |

---

## 14. What we deliberately did not do

- No merge into `summary` / Summaries UI
- No auto-save of every generate (user must opt in)
- No streaming UI (one `call().entity()`)
- No RAG / vector store (lesson text is the only context)
- No Spring AI 2.x (needs Boot 4; this app is Boot 3.5.7)
