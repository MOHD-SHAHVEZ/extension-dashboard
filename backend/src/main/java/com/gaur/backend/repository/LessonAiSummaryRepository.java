package com.gaur.backend.repository;

import com.gaur.backend.model.LessonAiSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LessonAiSummaryRepository extends JpaRepository<LessonAiSummary, Long> {

    Optional<LessonAiSummary> findByIdAndOwner(Long id, String owner);

    List<LessonAiSummary> findByLessonIdAndOwner(Long lessonId, String owner);

    List<LessonAiSummary> findByLessonIdAndOwnerAndSavedTrueOrderByCreatedAtDesc(Long lessonId, String owner);

    List<LessonAiSummary> findByOwnerAndSavedTrueOrderByCreatedAtDesc(String owner);

    void deleteByLessonIdAndOwner(Long lessonId, String owner);

    void deleteByNotebookIdAndOwner(Long notebookId, String owner);
}
