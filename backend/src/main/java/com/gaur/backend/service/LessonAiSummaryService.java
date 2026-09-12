package com.gaur.backend.service;

import com.gaur.backend.ai.GeneratedLessonNotes;
import com.gaur.backend.ai.SpringAiLessonSummarizer;
import com.gaur.backend.dto.LessonAiSummaryResponse;
import com.gaur.backend.exception.ResourceNotFoundException;
import com.gaur.backend.model.LessonAiSummary;
import com.gaur.backend.model.LessonNote;
import com.gaur.backend.model.Notebook;
import com.gaur.backend.repository.LessonAiSummaryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class LessonAiSummaryService {

    private final LessonNoteService lessonNoteService;
    private final LessonAiSummaryRepository summaryRepo;
    private final SpringAiLessonSummarizer summarizer;
    private final SummaryService summaryService;
    private final NotebookService notebookService;

    public LessonAiSummaryService(
            LessonNoteService lessonNoteService,
            LessonAiSummaryRepository summaryRepo,
            SpringAiLessonSummarizer summarizer,
            SummaryService summaryService,
            NotebookService notebookService
    ) {
        this.lessonNoteService = lessonNoteService;
        this.summaryRepo = summaryRepo;
        this.summarizer = summarizer;
        this.summaryService = summaryService;
        this.notebookService = notebookService;
    }

    @Transactional
    public LessonAiSummaryResponse generate(Long lessonId, String owner) {
        LessonNote lesson = lessonNoteService.requireOwnedLesson(lessonId, owner);
        String body = lesson.getContent() == null ? "" : lesson.getContent().trim();
        if (body.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Write some lesson content first, then generate a summary."
            );
        }

        GeneratedLessonNotes notes = summarizer.summarize(lesson.getLessonTitle(), body);
        LessonAiSummary row = new LessonAiSummary();
        row.setLessonId(lesson.getId());
        row.setNotebookId(lesson.getNotebook().getId());
        row.setOwner(owner);
        row.setLessonTitle(lesson.getLessonTitle());
        row.setSubjectName(lesson.getNotebook() != null ? lesson.getNotebook().getSubjectName() : null);
        row.setTitle(safe(notes.title(), lesson.getLessonTitle() + " — revision notes"));
        row.setExcerpt(safe(notes.excerpt(), ""));
        row.setContent(safe(notes.markdown(), notes.excerpt()));
        row.setModelUsed(summarizer.modelName());
        row.setStatus(LessonAiSummary.STATUS_DRAFT);
        row.setSaved(false);
        return toResponse(summaryRepo.save(row));
    }

    @Transactional
    public LessonAiSummaryResponse save(Long id, String owner) {
        LessonAiSummary row = requireOwned(id, owner);
        row.setSaved(true);
        row.setStatus(LessonAiSummary.STATUS_SAVED);
        LessonAiSummary saved = summaryRepo.save(fillSubject(owner, row));
        summaryService.publishLessonAiSummary(owner, saved);
        return toResponse(saved);
    }

    @Transactional
    public List<LessonAiSummaryResponse> listSaved(Long lessonId, String owner) {
        lessonNoteService.requireOwnedLesson(lessonId, owner);
        List<LessonAiSummary> rows = summaryRepo.findByLessonIdAndOwnerAndSavedTrueOrderByCreatedAtDesc(lessonId, owner);
        rows.forEach((row) -> publish(owner, row));
        return rows.stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<LessonAiSummaryResponse> listAllSaved(String owner) {
        List<LessonAiSummary> rows = summaryRepo.findByOwnerAndSavedTrueOrderByCreatedAtDesc(owner);
        rows.forEach((row) -> publish(owner, row));
        return rows.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public LessonAiSummaryResponse getOne(Long id, String owner) {
        return toResponse(requireOwned(id, owner));
    }

    @Transactional
    public void delete(Long id, String owner) {
        LessonAiSummary row = requireOwned(id, owner);
        summaryService.unpublishLessonAiSummary(owner, row.getId());
        summaryRepo.delete(row);
    }

    private LessonAiSummary requireOwned(Long id, String owner) {
        return summaryRepo.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson AI summary not found"));
    }

    private LessonAiSummaryResponse toResponse(LessonAiSummary row) {
        LessonAiSummaryResponse out = new LessonAiSummaryResponse();
        out.setId(row.getId());
        out.setLessonId(row.getLessonId());
        out.setNotebookId(row.getNotebookId());
        out.setLessonTitle(row.getLessonTitle());
        out.setSubjectName(row.getSubjectName());
        out.setTitle(row.getTitle());
        out.setExcerpt(row.getExcerpt());
        out.setContent(row.getContent());
        out.setModelUsed(row.getModelUsed());
        out.setStatus(row.getStatus());
        out.setSaved(row.isSaved());
        out.setCreatedAt(row.getCreatedAt());
        out.setUpdatedAt(row.getUpdatedAt());
        return out;
    }

    private void publish(String owner, LessonAiSummary row) {
        summaryService.publishLessonAiSummary(owner, fillSubject(owner, row));
    }

    private LessonAiSummary fillSubject(String owner, LessonAiSummary row) {
        if (row.getSubjectName() == null || row.getSubjectName().isBlank()) {
            try {
                Notebook notebook = notebookService.getOwnedNotebookOrThrow(row.getNotebookId(), owner);
                row.setSubjectName(notebook.getSubjectName());
                summaryRepo.save(row);
            } catch (Exception ignored) {
                // keep listing even if the notebook was renamed/deleted
            }
        }
        return row;
    }

    private static String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
