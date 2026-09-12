package com.gaur.backend.dto;

import java.time.LocalDateTime;

public class LessonNoteResponse {
    private Long id;
    private Long notebookId;
    private String lessonTitle;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public LessonNoteResponse() {}

    public LessonNoteResponse(
            Long id,
            Long notebookId,
            String lessonTitle,
            String content,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this.id = id;
        this.notebookId = notebookId;
        this.lessonTitle = lessonTitle;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getNotebookId() { return notebookId; }
    public void setNotebookId(Long notebookId) { this.notebookId = notebookId; }
    public String getLessonTitle() { return lessonTitle; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
