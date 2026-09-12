package com.gaur.backend.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "summary", indexes = {
        @Index(name = "idx_summary_owner", columnList = "owner"),
        @Index(name = "idx_summary_user_id", columnList = "user_id"),
        @Index(name = "idx_summary_user_created", columnList = "user_id, created_at")
})
public class Summary {
    public static final String STATUS_READY = "READY";
    public static final String STATUS_PROCESSING = "PROCESSING";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(length = 2000)
    private String excerpt;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "source_url", length = 2048)
    private String sourceUrl;

    @Column(name = "created_at")
    private String createdAt;

    private Boolean pinned = Boolean.FALSE;

    private String owner;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "status", length = 32)
    private String status = STATUS_READY;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Convert(converter = StringListConverter.class)
    @Column(name = "tags", length = 500)
    private List<String> tags = new ArrayList<>();

    @Column(name = "subject_name", length = 200)
    private String subjectName;

    @Column(name = "lesson_title", length = 200)
    private String lessonTitle;

    @Column(name = "notebook_id")
    private Long notebookId;

    @Column(name = "lesson_id")
    private Long lessonId;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (status == null) status = STATUS_READY;
        if (pinned == null) pinned = Boolean.FALSE;
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getExcerpt() { return excerpt; }
    public void setExcerpt(String excerpt) { this.excerpt = excerpt; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public boolean isPinned() { return Boolean.TRUE.equals(pinned); }
    public Boolean getPinned() { return pinned; }
    public void setPinned(Boolean pinned) { this.pinned = pinned; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags != null ? tags : new ArrayList<>(); }
    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
    public String getLessonTitle() { return lessonTitle; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public Long getNotebookId() { return notebookId; }
    public void setNotebookId(Long notebookId) { this.notebookId = notebookId; }
    public Long getLessonId() { return lessonId; }
    public void setLessonId(Long lessonId) { this.lessonId = lessonId; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
