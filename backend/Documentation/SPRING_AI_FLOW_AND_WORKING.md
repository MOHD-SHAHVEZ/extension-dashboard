# Spring AI — Flow and Working (This Project)

| Field | Value |
|-------|-------|
| **Document** | End-to-end working of Spring AI in Nexus |
| **Feature** | Generate + optional save of a **notebook lesson** summary |
| **Spring AI** | 1.1.8 · `ChatClient` · OpenAI · structured output |
| **Last updated** | 2026-09-12 |

Use this when you want to **walk the runtime path** on a whiteboard. Theory is in [SPRING_AI_COMPLETE_GUIDE.md](./SPRING_AI_COMPLETE_GUIDE.md). API/DB details are in [LESSON_AI_SUMMARY_IMPLEMENTATION.md](./LESSON_AI_SUMMARY_IMPLEMENTATION.md).

---

## 1. Big picture

```
 ┌──────────────────────────────────────────────────────────────────┐
 │  BROWSER  NotebookDetail.jsx                                     │
 │  1. Save lesson if dirty                                         │
 │  2. POST /api/lessons/{id}/ai-summaries/generate                 │
 │  3. Show DRAFT modal                                             │
 │  4. Optional POST /api/lesson-ai-summaries/{id}/save             │
 └───────────────────────────────┬──────────────────────────────────┘
                                 │ Authorization: Bearer JWT
                                 ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  SPRING MVC  LessonAiSummaryController                           │
 │  SecurityUtils.currentUsername() = JWT subject (email)           │
 └───────────────────────────────┬──────────────────────────────────┘
                                 ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  LessonAiSummaryService                                          │
 │  • requireOwnedLesson(id, owner)                                 │
 │  • reject empty content                                          │
 │  • call Spring AI adapter                                        │
 │  • persist DRAFT / later flip SAVED                              │
 └──────────────┬─────────────────────────────┬─────────────────────┘
                │                             │
                ▼                             ▼
 ┌──────────────────────────┐    ┌──────────────────────────────────┐
 │  PostgreSQL              │    │  SpringAiLessonSummarizer        │
 │  lesson_note (read)      │    │  ChatClient.Builder              │
 │  lesson_ai_summary (write)│    │          │                      │
 └──────────────────────────┘    │          ▼                      │
                                 │  OpenAiChatModel (auto-config)   │
                                 │          │                      │
                                 │          ▼                      │
                                 │  POST api.openai.com             │
                                 │  model = gpt-4o-mini (default)   │
                                 └──────────────────────────────────┘
```

Two persistence moments:

| Moment | Row state | UI |
|--------|-----------|-----|
| After generate | `status=DRAFT`, `saved=false` | Preview modal |
| After save | `status=SAVED`, `saved=true` | Listed under the lesson |

Spring AI is **only** in the generate box. Save / list / delete are plain JPA.

---

## 2. Boot-time flow (once per JVM)

```
mvn spring-boot:run
        │
        ▼
Spring Boot reads application.properties
        │
        ├── app.ai.openai-*          → legacy URL summarizer only
        └── spring.ai.openai.*       → Spring AI auto-config
                │
                ▼
OpenAI starter on classpath
        │
        ▼
Creates:
  • OpenAiApi / OpenAiChatModel
  • ChatClient.Builder  (injected via ObjectProvider)
        │
        ▼
Our @Component SpringAiLessonSummarizer is constructed
  (does NOT call OpenAI at startup)
```

**Important:** changing `OPENAI_API_KEY` after the process started does nothing. Restart.

If the key is empty, the app still starts. The first generate returns **503**.

---

## 3. Generate flow (happy path)

Actor: logged-in user, lesson already has text.

```
1. UI
   if editor dirty → PUT /api/lessons/{id}   (must persist first)
   POST /api/lessons/{lessonId}/ai-summaries/generate

2. JwtAuthFilter
   validates Bearer → SecurityContext.username = email

3. LessonAiSummaryController.generate(lessonId)
   owner = SecurityUtils.currentUsername()

4. LessonAiSummaryService.generate
   4a. LessonNoteService.requireOwnedLesson
         SELECT lesson_note WHERE id=? AND owner=?
         missing → ResourceNotFoundException → 404
   4b. content blank → 400
   4c. summarizer.summarize(title, content)

5. SpringAiLessonSummarizer
   5a. api-key blank → 503
   5b. ChatClient.Builder missing → 503
   5c. truncate content to 12_000 chars
   5d. build system + user strings (no {templates})
   5e. chatClient.prompt().system().user().call().entity(GeneratedLessonNotes.class)

6. Inside Spring AI (library, not our code)
   6a. BeanOutputConverter adds JSON-schema instructions
   6b. ChatModel builds OpenAI chat-completions request
       model / temperature / max-tokens from properties
   6c. HTTPS to OpenAI
   6d. Model returns JSON { title, excerpt, markdown }
   6e. Converter maps → GeneratedLessonNotes record

7. Service maps record → LessonAiSummary entity
   status=DRAFT, saved=false, modelUsed=configured model
   INSERT lesson_ai_summary

8. HTTP 201 + LessonAiSummaryResponse JSON

9. UI opens modal. User may Close (draft hidden from list)
   or Save this summary → section 4
```

### Sequence (compact)

```
User        NotebookDetail     Controller      Service         Summarizer      OpenAI
 │                │                 │              │                │             │
 │  click Summarize                 │              │                │             │
 │───────────────►│  POST generate  │              │                │             │
 │                │────────────────►│  generate()  │                │             │
 │                │                 │─────────────►│  summarize()   │             │
 │                │                 │              │───────────────►│  chat HTTP  │
 │                │                 │              │                │────────────►│
 │                │                 │              │                │◄────────────│
 │                │                 │              │◄───────────────│  record     │
 │                │                 │              │ INSERT draft   │             │
 │                │                 │◄─────────────│                │             │
 │                │◄──── 201 draft ─│              │                │             │
 │  preview modal │                 │              │                │             │
```

---

## 4. Save flow

```
POST /api/lesson-ai-summaries/{id}/save
        │
        ▼
findByIdAndOwner(id, email)     → 404 if not yours
        │
        ▼
saved = true
status = SAVED
        │
        ▼
200 + same DTO
        │
        ▼
UI refreshes GET /api/lessons/{lessonId}/ai-summaries
(only saved=true rows)
```

No second OpenAI call. Save is a **flag flip**.

---

## 5. List / get / delete

```
GET    /api/lessons/{lessonId}/ai-summaries
       → prove lesson ownership, then saved rows newest-first

GET    /api/lesson-ai-summaries/{id}
       → any owned row (draft or saved)

DELETE /api/lesson-ai-summaries/{id}
       → 204, row gone
```

None of these touch Spring AI.

---

## 6. What goes over the wire to OpenAI (conceptual)

Not copied 1:1 (the converter adds schema text), but the **intent** is:

**System**

- You are a study assistant.
- Rewrite the lesson into revision notes.
- Do not invent facts.
- Fill `title`, `excerpt`, `markdown`.

**User**

```text
Lesson title: Photosynthesis

Lesson content:
(plants, chlorophyll, … student's markdown …)
```

**Options** (from config)

- `model`: `gpt-4o-mini` by default
- `temperature`: `0.3`
- `max_tokens`: `1200`

**Response (after conversion)**

```text
GeneratedLessonNotes[
  title=...,
  excerpt=...,
  markdown=## Key points\n...
]
```

We store `markdown` in column `content`.

---

## 7. Failure paths (same picture, different exit)

```
                    generate()
                        │
        ┌───────────────┼──────────────────┐
        ▼               ▼                  ▼
   no JWT → 401    lesson empty → 400   not owner → 404
                        │
                        ▼
              SpringAiLessonSummarizer
                        │
        ┌───────────────┼──────────────────┐
        ▼               ▼                  ▼
   no API key → 503   no ChatClient → 503  OpenAI/parse → 502
                        │
                        ▼
                   201 DRAFT
```

UI shows `message` from `ApiExceptionHandler` (`success: false`).

---

## 8. Why generate uses DB text, not the textarea

```
Editor (React state)  ──dirty──►  PUT /api/lessons/{id}
                                         │
                                         ▼
                                   lesson_note.content
                                         │
                                         ▼
                                   Spring AI prompt
```

If we summarized the textarea without saving, a refresh would show notes that do not match the stored lesson. The button **saves first** when `dirty`.

---

## 9. Bean / class map (for “project samjha sakun”)

| Piece | Type | Lives in |
|-------|------|----------|
| `ChatClient.Builder` | Spring AI auto-config bean | starter, not our code |
| `OpenAiChatModel` | Spring AI `ChatModel` | starter |
| `SpringAiLessonSummarizer` | our `@Component` | `com.gaur.backend.ai` |
| `GeneratedLessonNotes` | Java `record` | same package |
| `LessonAiSummaryService` | `@Service` | business rules |
| `LessonAiSummary` | `@Entity` | table `lesson_ai_summary` |
| `LessonAiSummaryController` | `@RestController` | HTTP |

Rule of thumb: **only the `ai` package imports `org.springframework.ai`.** Controllers never talk to OpenAI.

---

## 10. Comparison: this flow vs URL summary flow

```
URL SUMMARY (old)
  Dashboard → POST /api/summaries/from-url
    → fetch HTML (Jsoup)
    → AiSummarizationService (HttpClient, optional OpenAI)
    → INSERT summary  (saved immediately)
    → Summaries page

LESSON SUMMARY (this module)
  Notebook → POST /api/lessons/{id}/ai-summaries/generate
    → read lesson_note
    → SpringAiLessonSummarizer (ChatClient)
    → INSERT lesson_ai_summary DRAFT
    → user Save → SAVED
```

Same `OPENAI_API_KEY`, **different code paths and tables**.

---

## 11. State machine of one AI summary row

```
                  generate()
                      │
                      ▼
                 ┌─────────┐
                 │  DRAFT  │  saved=false   (preview only)
                 └────┬────┘
                      │
           save()     │      delete()
                      ▼
                 ┌─────────┐
                 │  SAVED  │  saved=true    (listed)
                 └────┬────┘
                      │
                      │ delete()
                      ▼
                   (gone)
```

`FAILED` exists as a constant for a future “persist failed generate” path. Generate today throws 502 instead of inserting FAILED.

---

## 12. Tokens, cost, and truncation (working details)

```
lesson_note.content
        │
        │  if length > 12_000
        ▼
first 12_000 chars + "[truncated for model context]"
        │
        ▼
prompt tokens  ≈  system + schema + truncated lesson
        │
        ▼
OpenAI bills input + output
        │
        ▼
output capped by max-tokens = 1200
```

`gpt-4o-mini` is cheap; still truncate so one huge paste cannot explode the bill or the context window.

---

## 13. Frontend working (same feature)

```
selected lesson changes
        → GET saved summaries → cards under editor

click Summarize lesson
        → optional PUT lesson
        → POST generate (may take several seconds)
        → modal: title, excerpt, markdown preview
        → Close = leave draft
        → Save this summary = POST save → card appears

click saved card
        → modal read-only (already saved)

Delete
        → confirm → DELETE → card removed
```

API helpers live in `Frontend/src/services/api.js` under **LESSON AI SUMMARIES**, not under SUMMARIES.

---

## 14. How to demo / explain in 60 seconds

1. Open a notebook lesson with real notes.
2. Click **Summarize lesson**.
3. Say: “JWT hits our controller, we load **your** lesson, Spring AI `ChatClient` calls **gpt-4o-mini**, structured JSON becomes a Java record, we store a **draft**.”
4. Click **Save this summary**.
5. Say: “No second model call — we only mark `saved=true`. List is owner-scoped.”

If asked “why Spring AI?”: structured output, properties-based model, room for advisors later, isolated from the old HttpClient summarizer.

---

## 15. Restart reminder

This backend has **no DevTools**. After Java or `pom.xml` changes:

1. Stop the old `spring-boot:run` / Java PID on port 8080.
2. Compile (Maven must download Spring AI 1.1.8 the first time).
3. Start again with `OPENAI_API_KEY` in that shell.

Frontend Vite HMR is enough for `NotebookDetail.jsx` / `api.js`.
