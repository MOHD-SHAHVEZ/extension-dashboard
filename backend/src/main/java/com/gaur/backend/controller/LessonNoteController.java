package com.gaur.backend.controller;

import com.gaur.backend.dto.LessonFileImportResponse;
import com.gaur.backend.dto.LessonNoteRequest;
import com.gaur.backend.dto.LessonNoteResponse;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.LessonFileImportService;
import com.gaur.backend.service.LessonNoteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/lessons")
public class LessonNoteController {

    private final LessonNoteService lessonNoteService;
    private final LessonFileImportService lessonFileImportService;

    public LessonNoteController(LessonNoteService lessonNoteService, LessonFileImportService lessonFileImportService) {
        this.lessonNoteService = lessonNoteService;
        this.lessonFileImportService = lessonFileImportService;
    }

    @GetMapping("/{id}")
    public LessonNoteResponse getOne(@PathVariable Long id) {
        return lessonNoteService.getLessonDetail(id, SecurityUtils.currentUsername());
    }

    @PutMapping("/{id}")
    public LessonNoteResponse update(
            @PathVariable Long id,
            @Valid @RequestBody LessonNoteRequest request
    ) {
        return lessonNoteService.updateLesson(id, SecurityUtils.currentUsername(), request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        lessonNoteService.delete(id, SecurityUtils.currentUsername());
    }

    @PostMapping(value = "/{id}/import-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LessonFileImportResponse importFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        return lessonFileImportService.extract(id, SecurityUtils.currentUsername(), file);
    }
}
