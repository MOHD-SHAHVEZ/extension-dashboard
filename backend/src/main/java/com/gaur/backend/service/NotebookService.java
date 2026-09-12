package com.gaur.backend.service;

import com.gaur.backend.dto.NotebookRequest;
import com.gaur.backend.dto.NotebookResponse;
import com.gaur.backend.exception.ResourceNotFoundException;
import com.gaur.backend.model.Notebook;
import com.gaur.backend.repository.LessonAiSummaryRepository;
import com.gaur.backend.repository.LessonNoteRepository;
import com.gaur.backend.repository.NotebookRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NotebookService {

    private static final String DEFAULT_COLOR = "#4F46E5";

    private final NotebookRepository notebookRepo;
    private final LessonNoteRepository lessonRepo;
    private final LessonAiSummaryRepository aiSummaryRepo;

    public NotebookService(
            NotebookRepository notebookRepo,
            LessonNoteRepository lessonRepo,
            LessonAiSummaryRepository aiSummaryRepo
    ) {
        this.notebookRepo = notebookRepo;
        this.lessonRepo = lessonRepo;
        this.aiSummaryRepo = aiSummaryRepo;
    }

    @Transactional(readOnly = true)
    public List<NotebookResponse> getAllForUser(String owner) {
        List<Notebook> notebooks = notebookRepo.findByOwnerOrderByCreatedAtDesc(owner);
        if (notebooks.isEmpty()) return List.of();

        List<Long> ids = notebooks.stream().map(Notebook::getId).toList();
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : lessonRepo.countGroupedByNotebookIds(ids)) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return notebooks.stream()
                .map(n -> toResponse(n, counts.getOrDefault(n.getId(), 0L)))
                .toList();
    }

    @Transactional
    public NotebookResponse create(String owner, NotebookRequest request) {
        Notebook notebook = new Notebook();
        notebook.setOwner(owner);
        notebook.setSubjectName(request.getSubjectName().trim());
        notebook.setColor(normalizeColor(request.getColor()));
        Notebook saved = notebookRepo.save(notebook);
        return toResponse(saved, 0);
    }

    @Transactional
    public NotebookResponse update(Long id, String owner, NotebookRequest request) {
        Notebook notebook = getOwnedNotebookOrThrow(id, owner);
        notebook.setSubjectName(request.getSubjectName().trim());
        notebook.setColor(normalizeColor(request.getColor()));
        Notebook saved = notebookRepo.save(notebook);
        return toResponse(saved, lessonRepo.countByNotebookId(saved.getId()));
    }

    @Transactional
    public void delete(Long id, String owner) {
        Notebook notebook = getOwnedNotebookOrThrow(id, owner);
        aiSummaryRepo.deleteByNotebookIdAndOwner(notebook.getId(), owner);
        notebookRepo.delete(notebook);
    }

    @Transactional(readOnly = true)
    public Notebook getOwnedNotebookOrThrow(Long id, String owner) {
        return notebookRepo.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Notebook not found"));
    }

    @Transactional(readOnly = true)
    public NotebookResponse getOneForUser(Long id, String owner) {
        Notebook notebook = getOwnedNotebookOrThrow(id, owner);
        return toResponse(notebook, lessonRepo.countByNotebookId(notebook.getId()));
    }

    private static NotebookResponse toResponse(Notebook notebook, long lessonCount) {
        return new NotebookResponse(
                notebook.getId(),
                notebook.getSubjectName(),
                notebook.getColor(),
                notebook.getCreatedAt(),
                lessonCount
        );
    }

    static String normalizeColor(String color) {
        if (color == null || color.isBlank()) return DEFAULT_COLOR;
        return color.trim();
    }
}
