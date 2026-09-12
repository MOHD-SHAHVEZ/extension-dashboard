package com.gaur.backend.ai;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Notebook lesson summaries via Groq. Separate from URL {@code AiSummarizationService}.
 */
@Component
public class SpringAiLessonSummarizer {

    private static final int MAX_SOURCE_CHARS = 12_000;

    private static final String SYSTEM_PROMPT = """
            You are a careful study assistant. Rewrite the student's lesson into
            clear revision notes. Do not invent facts that are not in the source.
            Reply with JSON only. No markdown fences.
            Shape:
            {
              "title": "short revision heading",
              "excerpt": "1-2 sentence overview",
              "markdown": "study notes with headings, bullets, and key terms"
            }
            """;

    private final GroqChatService groq;

    public SpringAiLessonSummarizer(GroqChatService groq) {
        this.groq = groq;
    }

    public String modelName() {
        return groq.modelName();
    }

    public GeneratedLessonNotes summarize(String lessonTitle, String lessonContent) {
        String source = lessonContent == null ? "" : lessonContent;
        if (source.length() > MAX_SOURCE_CHARS) {
            source = source.substring(0, MAX_SOURCE_CHARS) + "\n\n[truncated for model context]";
        }
        String userPrompt = "Lesson title: "
                + (lessonTitle == null || lessonTitle.isBlank() ? "Untitled lesson" : lessonTitle)
                + "\n\nLesson content:\n"
                + source;
        GeneratedLessonNotes notes = groq.completeJson(SYSTEM_PROMPT, userPrompt, GeneratedLessonNotes.class);
        if (notes == null || (isBlank(notes.title()) && isBlank(notes.markdown()))) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Groq returned an empty lesson summary");
        }
        return notes;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    static boolean hasRealApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return false;
        }
        String trimmed = apiKey.trim();
        return !trimmed.equalsIgnoreCase("not-configured")
                && !trimmed.equalsIgnoreCase("dummy")
                && !trimmed.equalsIgnoreCase("changeme");
    }

    static String friendlyFailure(String fallback, Throwable ex) {
        String raw = ex == null || ex.getMessage() == null ? "" : ex.getMessage();
        String lower = raw.toLowerCase();
        if (lower.contains("insufficient_quota") || lower.contains("no credits remaining")
                || lower.contains("creditbalance") || lower.contains("billing")) {
            return "Groq credits/quota khatam ho gaye. Console me check karo, ya real GROQ_API_KEY set karke backend restart karo.";
        }
        if (lower.contains("invalid_api_key") || lower.contains("incorrect api key") || lower.contains("invalid api key")) {
            return "Groq API key invalid hai. GROQ_API_KEY check karke backend restart karo.";
        }
        if (lower.contains("model_decommissioned") || lower.contains("model_not_found") || lower.contains("does not exist")) {
            return "Groq model available nahi hai. GROQ_MODEL check karo (default: openai/gpt-oss-20b).";
        }
        if (lower.contains("429") || lower.contains("rate limit") || lower.contains("too many requests")) {
            return "Groq rate limit lag gaya. Thodi der baad try karo.";
        }
        if (lower.contains("empty reply") || lower.contains("not json") || lower.contains("end-of-input")) {
            return "Groq ne timetable/summary JSON nahi bheja. Dobara try karo.";
        }
        return fallback;
    }
}
