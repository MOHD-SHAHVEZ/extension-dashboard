package com.gaur.backend.repository;

import com.gaur.backend.model.LessonNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface LessonNoteRepository extends JpaRepository<LessonNote, Long> {

    List<LessonNote> findByNotebookIdAndOwnerOrderByCreatedAtAsc(Long notebookId, String owner);

    Optional<LessonNote> findByIdAndOwner(Long id, String owner);

    long countByNotebookId(Long notebookId);

    @Query("""
            select l.notebook.id, count(l.id)
            from LessonNote l
            where l.notebook.id in :notebookIds
            group by l.notebook.id
            """)
    List<Object[]> countGroupedByNotebookIds(@Param("notebookIds") Collection<Long> notebookIds);
}
