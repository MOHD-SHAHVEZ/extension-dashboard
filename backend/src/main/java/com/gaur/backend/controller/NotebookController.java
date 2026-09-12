package com.gaur.backend.controller;

import com.gaur.backend.dto.LessonNoteRequest;
import com.gaur.backend.dto.LessonNoteResponse;
import com.gaur.backend.dto.LessonNoteSummaryResponse;
import com.gaur.backend.dto.NotebookRequest;
import com.gaur.backend.dto.NotebookResponse;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.LessonNoteService;
import com.gaur.backend.service.NotebookService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notebooks")
public class NotebookController {

    private final NotebookService notebookService;
    private final LessonNoteService lessonNoteService;

    public NotebookController(NotebookService notebookService, LessonNoteService lessonNoteService) {
        this.notebookService = notebookService;
        this.lessonNoteService = lessonNoteService;
    }

    @GetMapping
    public List<NotebookResponse> list() {
        return notebookService.getAllForUser(SecurityUtils.currentUsername());
    }

    @GetMapping("/{id}")
    public NotebookResponse getOne(@PathVariable Long id) {
        return notebookService.getOneForUser(id, SecurityUtils.currentUsername());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NotebookResponse create(@Valid @RequestBody NotebookRequest request) {
        return notebookService.create(SecurityUtils.currentUsername(), request);
    }

    @PutMapping("/{id}")
    public NotebookResponse update(@PathVariable Long id, @Valid @RequestBody NotebookRequest request) {
        return notebookService.update(id, SecurityUtils.currentUsername(), request);
    }

    @PostMapping("/{id}/update")
    public NotebookResponse updatePost(@PathVariable Long id, @Valid @RequestBody NotebookRequest request) {
        return notebookService.update(id, SecurityUtils.currentUsername(), request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        notebookService.delete(id, SecurityUtils.currentUsername());
    }

    @GetMapping("/{notebookId}/lessons")
    public List<LessonNoteSummaryResponse> listLessons(@PathVariable Long notebookId) {
        return lessonNoteService.getLessonsForNotebook(notebookId, SecurityUtils.currentUsername());
    }

    @PostMapping("/{notebookId}/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    public LessonNoteResponse addLesson(
            @PathVariable Long notebookId,
            @Valid @RequestBody LessonNoteRequest request
    ) {
        return lessonNoteService.addLesson(notebookId, SecurityUtils.currentUsername(), request);
    }
}
