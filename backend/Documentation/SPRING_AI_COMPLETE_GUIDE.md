# Spring AI — Complete Guide (Basic → Advanced) for This Project

| Field | Value |
|-------|-------|
| **Document** | Spring AI theory + what Nexus actually uses |
| **Spring AI version** | **1.1.8** (BOM) |
| **Spring Boot** | **3.5.7** |
| **Java** | 17 |
| **Starter in this repo** | `spring-ai-starter-model-openai` |
| **Used for** | Notebook lesson summaries only |
| **Not used for** | URL `/api/summaries` (legacy `HttpClient`) |
| **Last updated** | 2026-09-12 |

Read this if you need to **explain Spring AI** in an interview, to a teammate, or when you add the next AI feature. The implementation notes are in [LESSON_AI_SUMMARY_IMPLEMENTATION.md](./LESSON_AI_SUMMARY_IMPLEMENTATION.md). The runtime path is drawn in [SPRING_AI_FLOW_AND_WORKING.md](./SPRING_AI_FLOW_AND_WORKING.md).

---

## 0. Version rule (read this first)

| Combo | Status for this repo |
|-------|----------------------|
| Spring Boot **3.5.x** + Spring AI **1.1.x** | **What we use** |
| Spring Boot **4.x** + Spring AI **2.x** | Do **not** upgrade just for AI — Boot 4 is a different platform |

Spring AI 2.x is not drop-in compatible. Stay on **1.1.8** until the whole backend moves to Boot 4.

Official docs for this line: [https://docs.spring.io/spring-ai/reference/](https://docs.spring.io/spring-ai/reference/)

---

## 1. What Spring AI is

Spring AI is a **Spring-style facade** over LLM providers (OpenAI, Azure OpenAI, Ollama, Anthropic, etc.).

Instead of writing:

```text
HttpClient → POST https://api.openai.com/v1/chat/completions
  headers, JSON body, parse choices[0].message.content
```

you write:

```java
chatClient.prompt()
    .system("You are a study assistant")
    .user(lessonText)
    .call()
    .entity(GeneratedLessonNotes.class);
```

Spring AI owns:

1. **ChatModel** — provider SDK (OpenAI HTTP).
2. **ChatClient** — fluent API (system / user / advisors / converters).
3. **Auto-configuration** — beans from `application.properties`.
4. **Output converters** — map model text → Java record / bean.
5. **Optional later** — advisors, memory, RAG, tools / function calling, vector stores.

This project uses **1–4 only**. We do not use RAG, tools, or memory yet.

---

## 2. Why we added it (and why we kept the old path)

| Feature | Client | Why |
|---------|--------|-----|
| URL page summaries | Legacy `HttpClient` in `AiSummarizationService` | Already working; do not rewrite in this module |
| Lesson revision notes | **Spring AI `ChatClient`** | New module; structured JSON; easier to teach and extend |

Two AI stacks in one app is intentional. Lesson AI must stay isolated.

---

## 3. Maven setup (what is in `pom.xml`)

### 3.1 BOM

```xml
<properties>
    <spring-ai.version>1.1.8</spring-ai.version>
</properties>

<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>${spring-ai.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

The BOM pins every `org.springframework.ai` artifact so you do not invent versions per jar.

### 3.2 Starter we use

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

That starter pulls:

- `spring-ai-openai` — `OpenAiChatModel`, options, API client
- `spring-ai-autoconfigure` — creates `ChatModel` + `ChatClient.Builder` when properties exist
- Jackson, retry, HTTP pieces Spring AI needs

We did **not** add:

| Artifact | Why skipped |
|----------|-------------|
| `spring-ai-starter-vector-store-*` | No RAG |
| `spring-ai-advisors-vector-store` | No retrieval advisor |
| `spring-ai-starter-model-ollama` | Cloud OpenAI, not local Ollama |
| Embedding starters | No embeddings table |

---

## 4. Configuration (basic → what we set)

### 4.1 Minimum to talk to OpenAI

```properties
spring.ai.openai.api-key=${OPENAI_API_KEY:}
```

### 4.2 Chat options we actually set

```properties
spring.ai.openai.chat.options.model=${SPRING_AI_OPENAI_MODEL:${OPENAI_MODEL:gpt-4o-mini}}
spring.ai.openai.chat.options.temperature=${SPRING_AI_TEMPERATURE:0.3}
spring.ai.openai.chat.options.max-tokens=${SPRING_AI_MAX_TOKENS:1200}
```

| Property | Meaning |
|----------|---------|
| `api-key` | Bearer token to `api.openai.com` |
| `chat.options.model` | Which chat model |
| `temperature` | 0.0–2.0. We use **0.3** so notes stay close to the lesson |
| `max-tokens` | Upper bound on **output** tokens (not input) |

### 4.3 Other OpenAI properties (available, unused)

You may see these in Spring AI docs. We leave defaults unless we need them later:

| Property | Typical use |
|----------|-------------|
| `spring.ai.openai.base-url` | Azure / proxy / compatible API |
| `spring.ai.openai.chat.completions-path` | Non-standard path |
| `spring.ai.openai.chat.options.top-p` | Nucleus sampling |
| `spring.ai.openai.embedding.*` | Embeddings (RAG) |

### 4.4 Keys you must export

See the implementation doc. Short version:

```bash
export OPENAI_API_KEY=sk-...                 # required for generate
export SPRING_AI_OPENAI_MODEL=gpt-4o-mini    # optional
```

Restart the JVM after changing env.

---

## 5. Core objects (basic)

Think of four layers:

```
Your service
    → ChatClient          (fluent, high level)
        → ChatModel       (OpenAiChatModel)
            → OpenAI HTTP API
```

### 5.1 `ChatModel`

Low-level: `call(Prompt) → ChatResponse`. You almost never use this directly in this project.

### 5.2 `ChatClient`

High-level builder Spring recommends.

Auto-config exposes **`ChatClient.Builder`**. You call `.build()` per request (cheap) or once as a `@Bean`.

We inject `ObjectProvider<ChatClient.Builder>` so missing auto-config becomes a 503 instead of a failed startup, and so we can still check the API key ourselves.

### 5.3 `Prompt` / messages

| Role | Meaning |
|------|---------|
| **system** | Standing instructions (persona, format, “do not invent facts”) |
| **user** | This request (lesson title + content) |
| **assistant** | Previous model replies (chat memory — we do not send any) |
| **tool** | Function results (we do not use tools) |

Each generate is a **stateless one-shot**: system + one user message.

### 5.4 `ChatResponse`

Contains generations, token usage, metadata. We skip it because `.entity(Class)` already unwraps the mapped object.

---

## 6. The call we use (intermediate)

```java
GeneratedLessonNotes notes = builder.build()
        .prompt()
        .system(SYSTEM_PROMPT)
        .user(userPrompt)
        .call()
        .entity(GeneratedLessonNotes.class);
```

Step by step:

| Step | API | What happens |
|------|-----|----------------|
| `builder.build()` | New `ChatClient` using auto-config `ChatModel` + default options |
| `.prompt()` | Start a prompt spec |
| `.system(...)` | System message |
| `.user(...)` | User message as a **plain string** |
| `.call()` | Blocking HTTP to OpenAI |
| `.entity(GeneratedLessonNotes.class)` | Parse JSON → Java record |

### 6.1 Why not `{title}` / `{content}` templates?

Spring AI user specs can do:

```java
.user(u -> u.text("Hello {name}").param("name", "Mohd"))
```

That uses `PromptTemplate`. If the lesson contains `{formula}` or `{#id}`, the template engine tries to resolve those keys and **fails or corrupts the prompt**.

Lesson notes are markdown. We concatenate strings instead. **Do not** put raw lesson body into `{placeholders}`.

### 6.2 Structured output

```java
public record GeneratedLessonNotes(
        String title,
        String excerpt,
        String markdown
) {}
```

`.entity(Record.class)` uses `BeanOutputConverter`:

1. Builds a JSON schema / example from the record fields.
2. Appends “return JSON matching this schema” to the request.
3. Parses the model reply (strips markdown fences if needed).
4. Returns a typed object.

If parsing fails, we catch and throw **502**.

Field names are a **contract**. Renaming `markdown` → `body` without updating the prompt mental model will confuse the converter.

### 6.3 Alternatives we did not use

| Style | When you would use it |
|-------|------------------------|
| `.call().content()` | Raw string, you parse yourself |
| `.stream()` | Token-by-token SSE to the browser |
| `BeanOutputConverter` manually | Custom prompt wrapping |
| `ListOutputConverter` | Model returns a JSON array |

---

## 7. Auto-configuration (how beans appear)

On classpath: `spring-ai-starter-model-openai`.

If `spring.ai.openai.api-key` is present (even empty string in our setup):

1. `OpenAiChatModel` bean is created.
2. `ChatClient.Builder` bean is created, pre-wired to that model.
3. Default options (model, temperature, max-tokens) come from `spring.ai.openai.chat.options.*`.

You do **not** write `@Bean OpenAiApi` unless you need a custom base URL or HTTP client.

Our adapter is a normal `@Component`. It is **not** a Spring AI advisor.

---

## 8. Error handling in this project

| Layer | Behavior |
|-------|----------|
| Blank `OPENAI_API_KEY` | 503 before any HTTP |
| No `ChatClient.Builder` | 503 |
| Empty lesson | 400 in `LessonAiSummaryService` |
| OpenAI 401 / 429 / 5xx / parse error | Logged, rethrown as 502 |
| `ResponseStatusException` | Mapped by `ApiExceptionHandler` |

We do not retry in our code. Spring AI / the OpenAI client may apply default retry for transient IO depending on version. Treat **429 quota** as user-visible 502 and check the OpenAI dashboard.

---

## 9. Advanced Spring AI (not in this module — learn for later)

This section is for understanding the ecosystem. **None of this is wired in Nexus today.**

### 9.1 Advisors

Advisors wrap a `ChatClient` call (logging, memory, RAG, safety).

```java
ChatClient.builder(chatModel)
    .defaultAdvisors(new SimpleLoggerAdvisor())
    .build();
```

Later: a logging advisor around lesson generate would help debug prompts without `System.out`.

### 9.2 Chat memory

`MessageChatMemoryAdvisor` + `ChatMemory` keeps last N turns. Useful for a “ask a question about this lesson” chat. **Not** needed for one-shot summary.

### 9.3 RAG (Retrieval Augmented Generation)

1. Split documents → embeddings (`EmbeddingModel`).
2. Store vectors (`VectorStore`: PgVector, Redis, …).
3. On query, retrieve similar chunks.
4. Stuff chunks into the prompt (`QuestionAnswerAdvisor`).

We skip RAG because the **whole lesson is already the context** (truncated at 12k chars). RAG would matter for “search all my notebooks”.

### 9.4 Tools / function calling

You register Java methods; the model may call them (weather, DB lookup). Not used. A future “create tasks from this lesson” feature could use tools.

### 9.5 Multimodality

Image + text. Not used.

### 9.6 Evaluation / observability

Spring AI can expose token usage and observation. Actuator is already on the app; we have not bound AI metrics yet.

### 9.7 Switching providers

Same `ChatClient` API. Swap starter + properties:

| Provider | Starter (1.1.x name family) | Typical key |
|----------|----------------------------|-------------|
| OpenAI | `spring-ai-starter-model-openai` | `OPENAI_API_KEY` |
| Azure OpenAI | Azure starter | Azure endpoint + key |
| Ollama (local) | Ollama starter | no cloud key; local daemon |

Service code (`LessonAiSummaryService`) should stay provider-agnostic. Only `SpringAiLessonSummarizer` + properties should change.

### 9.8 Prompt stuffing vs truncation

LLMs have a **context window**. We truncate at 12_000 characters (~3k tokens ballpark) so we stay well under `gpt-4o-mini` limits and control cost. If you raise this, also watch `max-tokens` (output) and billing.

---

## 10. Mental model: Spring AI vs “just REST”

```
WITHOUT Spring AI (URL summaries today)
  Service → HttpClient → JSON string → manual parse → DTO

WITH Spring AI (lesson summaries)
  Service → ChatClient → ChatModel → OpenAI
                         ↓
                  BeanOutputConverter
                         ↓
                  GeneratedLessonNotes
```

Benefits you can say out loud:

- Provider-neutral API
- Structured output without hand-rolled JSON prompts
- Options in `application.properties`
- Room to add advisors / RAG later without rewriting the controller

Cost of the abstraction:

- Extra dependency
- Must understand converters and prompt templates
- Version lock to Boot 3.5 / AI 1.1.8

---

## 11. How to explain this in the project (short script)

> “URL summaries already used a raw OpenAI HTTP client. For notebook lessons we added a **separate** module on **Spring AI 1.1.8**. The controller stays REST/JWT. `LessonAiSummaryService` owns draft vs saved. `SpringAiLessonSummarizer` is the only class that touches `ChatClient`. We use **structured output** into a Java record, temperature 0.3, model **gpt-4o-mini**, key from `OPENAI_API_KEY`. Generate stores a draft; the user must save. We did not use RAG or tools because the lesson text is the full context.”

---

## 12. Checklist if you add another Spring AI feature

1. Keep a dedicated adapter class (do not put `ChatClient` in controllers).
2. Do not template untrusted / markdown user text with `{placeholders}`.
3. Check API key → 503; model errors → 502.
4. Persist `modelUsed` for debugging.
5. Stay on Spring AI 1.1.x while Boot is 3.5.x.
6. Write the new flow into `SPRING_AI_FLOW_AND_WORKING.md`.
