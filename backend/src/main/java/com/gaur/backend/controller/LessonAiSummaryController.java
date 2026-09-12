package com.gaur.backend.controller;

import com.gaur.backend.dto.LessonAiSummaryResponse;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.LessonAiSummaryService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class LessonAiSummaryController {

    private final LessonAiSummaryService lessonAiSummaryService;

    public LessonAiSummaryController(LessonAiSummaryService lessonAiSummaryService) {
        this.lessonAiSummaryService = lessonAiSummaryService;
    }

    @PostMapping("/api/lessons/{lessonId}/ai-summaries/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public LessonAiSummaryResponse generate(@PathVariable Long lessonId) {
        return lessonAiSummaryService.generate(lessonId, SecurityUtils.currentUsername());
    }

    @GetMapping("/api/lessons/{lessonId}/ai-summaries")
    public List<LessonAiSummaryResponse> listSaved(@PathVariable Long lessonId) {
        return lessonAiSummaryService.listSaved(lessonId, SecurityUtils.currentUsername());
    }

    @GetMapping("/api/lesson-ai-summaries")
    public List<LessonAiSummaryResponse> listAllSaved() {
        return lessonAiSummaryService.listAllSaved(SecurityUtils.currentUsername());
    }

    @PostMapping("/api/lesson-ai-summaries/{id}/save")
    public LessonAiSummaryResponse save(@PathVariable Long id) {
        return lessonAiSummaryService.save(id, SecurityUtils.currentUsername());
    }

    @GetMapping("/api/lesson-ai-summaries/{id}")
    public LessonAiSummaryResponse getOne(@PathVariable Long id) {
        return lessonAiSummaryService.getOne(id, SecurityUtils.currentUsername());
    }

    @DeleteMapping("/api/lesson-ai-summaries/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        lessonAiSummaryService.delete(id, SecurityUtils.currentUsername());
    }
}
