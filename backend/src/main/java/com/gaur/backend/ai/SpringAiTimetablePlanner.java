package com.gaur.backend.ai;

import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SpringAiTimetablePlanner {

    private static final String SYSTEM_PROMPT = """
            You design a realistic DAILY study timetable from a student's written routine.
            Reply with JSON only. No markdown fences.
            Shape:
            {
              "summary": "2-3 sentences",
              "slots": [
                {
                  "time": "09:00 AM",
                  "endTime": "10:00 AM",
                  "title": "short title",
                  "desc": "one helpful line",
                  "category": "study",
                  "day": "Mon"
                }
              ]
            }
            category must be one of: study, work, project, interview, health
            day must be one of: Mon, Tue, Wed, Thu, Fri, Sat, Sun
            Follow the written daily routine exactly for wake, college, job, gym, meals, and sleep.
            Put study only in free gaps. Never overlap fixed routine blocks.
            Honor each subject's daily hour budget.
            Repeat the same weekday plan for Mon-Fri.
            Add Saturday/Sunday only if the routine mentions weekends.
            Prefer 45-90 minute study blocks. Do not invent extra long study just to fill the day.
            """;

    private final GroqChatService groq;

    public SpringAiTimetablePlanner(GroqChatService groq) {
        this.groq = groq;
    }

    public GeneratedTimetable plan(String userPrompt) {
        GeneratedTimetable plan = groq.completeJson(SYSTEM_PROMPT, userPrompt, GeneratedTimetable.class);
        if (plan == null || plan.slots() == null || plan.slots().isEmpty()) {
            throw new ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "AI returned no usable timetable slots"
            );
        }
        return plan;
    }

    public String modelName() {
        return groq.modelName();
    }
}
