package com.gaur.backend.dto;

import java.time.LocalDateTime;

public class LessonNoteSummaryResponse {
    private Long id;
    private String lessonTitle;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public LessonNoteSummaryResponse() {}

    public LessonNoteSummaryResponse(Long id, String lessonTitle, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.lessonTitle = lessonTitle;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getLessonTitle() { return lessonTitle; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
