package com.gaur.backend.service;

import com.gaur.backend.dto.LessonNoteRequest;
import com.gaur.backend.dto.LessonNoteResponse;
import com.gaur.backend.dto.LessonNoteSummaryResponse;
import com.gaur.backend.exception.ResourceNotFoundException;
import com.gaur.backend.model.LessonNote;
import com.gaur.backend.model.Notebook;
import com.gaur.backend.repository.LessonAiSummaryRepository;
import com.gaur.backend.repository.LessonNoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LessonNoteService {

    private final LessonNoteRepository lessonRepo;
    private final NotebookService notebookService;
    private final LessonAiSummaryRepository aiSummaryRepo;
    private final SummaryService summaryService;

    public LessonNoteService(
            LessonNoteRepository lessonRepo,
            NotebookService notebookService,
            LessonAiSummaryRepository aiSummaryRepo,
            SummaryService summaryService
    ) {
        this.lessonRepo = lessonRepo;
        this.notebookService = notebookService;
        this.aiSummaryRepo = aiSummaryRepo;
        this.summaryService = summaryService;
    }

    @Transactional(readOnly = true)
    public List<LessonNoteSummaryResponse> getLessonsForNotebook(Long notebookId, String owner) {
        notebookService.getOwnedNotebookOrThrow(notebookId, owner);
        return lessonRepo.findByNotebookIdAndOwnerOrderByCreatedAtAsc(notebookId, owner).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public LessonNoteResponse addLesson(Long notebookId, String owner, LessonNoteRequest request) {
        Notebook notebook = notebookService.getOwnedNotebookOrThrow(notebookId, owner);
        LessonNote lesson = new LessonNote();
        lesson.setNotebook(notebook);
        lesson.setOwner(owner);
        lesson.setLessonTitle(request.getLessonTitle().trim());
        lesson.setContent(request.getContent() == null ? "" : request.getContent());
        return toDetail(lessonRepo.save(lesson));
    }

    @Transactional(readOnly = true)
    public LessonNote requireOwnedLesson(Long id, String owner) {
        return getOwnedLessonOrThrow(id, owner);
    }

    @Transactional(readOnly = true)
    public LessonNoteResponse getLessonDetail(Long id, String owner) {
        return toDetail(getOwnedLessonOrThrow(id, owner));
    }

    @Transactional
    public LessonNoteResponse updateLesson(Long id, String owner, LessonNoteRequest request) {
        LessonNote lesson = getOwnedLessonOrThrow(id, owner);
        lesson.setLessonTitle(request.getLessonTitle().trim());
        lesson.setContent(request.getContent() == null ? "" : request.getContent());
        return toDetail(lessonRepo.save(lesson));
    }

    @Transactional
    public void delete(Long id, String owner) {
        LessonNote lesson = getOwnedLessonOrThrow(id, owner);
        aiSummaryRepo.findByLessonIdAndOwner(lesson.getId(), owner)
                .forEach((row) -> summaryService.unpublishLessonAiSummary(owner, row.getId()));
        aiSummaryRepo.deleteByLessonIdAndOwner(lesson.getId(), owner);
        lessonRepo.delete(lesson);
    }

    private LessonNote getOwnedLessonOrThrow(Long id, String owner) {
        return lessonRepo.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
    }

    private LessonNoteSummaryResponse toSummary(LessonNote lesson) {
        return new LessonNoteSummaryResponse(
                lesson.getId(),
                lesson.getLessonTitle(),
                lesson.getCreatedAt(),
                lesson.getUpdatedAt()
        );
    }

    private LessonNoteResponse toDetail(LessonNote lesson) {
        return new LessonNoteResponse(
                lesson.getId(),
                lesson.getNotebook().getId(),
                lesson.getLessonTitle(),
                lesson.getContent(),
                lesson.getCreatedAt(),
                lesson.getUpdatedAt()
        );
    }
}
