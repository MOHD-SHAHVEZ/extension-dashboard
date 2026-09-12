package com.gaur.backend.ai;

/**
 * Structured output mapped by Spring AI from the chat model.
 * Field names are part of the prompt contract — keep them stable.
 */
public record GeneratedLessonNotes(
        String title,
        String excerpt,
        String markdown
) {}
