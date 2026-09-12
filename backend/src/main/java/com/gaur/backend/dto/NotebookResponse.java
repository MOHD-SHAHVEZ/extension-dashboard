package com.gaur.backend.dto;

import java.time.LocalDateTime;

public class NotebookResponse {
    private Long id;
    private String subjectName;
    private String color;
    private LocalDateTime createdAt;
    private long lessonCount;

    public NotebookResponse() {}

    public NotebookResponse(Long id, String subjectName, String color, LocalDateTime createdAt, long lessonCount) {
        this.id = id;
        this.subjectName = subjectName;
        this.color = color;
        this.createdAt = createdAt;
        this.lessonCount = lessonCount;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public long getLessonCount() { return lessonCount; }
    public void setLessonCount(long lessonCount) { this.lessonCount = lessonCount; }
}
