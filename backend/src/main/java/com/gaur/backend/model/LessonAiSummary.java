package com.gaur.backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_ai_summary", indexes = {
        @Index(name = "idx_lesson_ai_owner", columnList = "owner"),
        @Index(name = "idx_lesson_ai_lesson", columnList = "lesson_id, saved")
})
public class LessonAiSummary {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_SAVED = "SAVED";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "notebook_id", nullable = false)
    private Long notebookId;

    @Column(nullable = false, length = 255)
    private String owner;

    @Column(name = "lesson_title", length = 200)
    private String lessonTitle;

    @Column(name = "subject_name", length = 200)
    private String subjectName;

    @Column(length = 255)
    private String title;

    @Column(length = 2000)
    private String excerpt;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "model_used", length = 64)
    private String modelUsed;

    @Column(nullable = false, length = 16)
    private String status = STATUS_DRAFT;

    @Column(nullable = false)
    private Boolean saved = Boolean.FALSE;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (status == null) status = STATUS_DRAFT;
        if (saved == null) saved = Boolean.FALSE;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getLessonId() { return lessonId; }
    public void setLessonId(Long lessonId) { this.lessonId = lessonId; }
    public Long getNotebookId() { return notebookId; }
    public void setNotebookId(Long notebookId) { this.notebookId = notebookId; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public String getLessonTitle() { return lessonTitle; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getExcerpt() { return excerpt; }
    public void setExcerpt(String excerpt) { this.excerpt = excerpt; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getModelUsed() { return modelUsed; }
    public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getSaved() { return saved; }
    public void setSaved(Boolean saved) { this.saved = saved; }
    public boolean isSaved() { return Boolean.TRUE.equals(saved); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
