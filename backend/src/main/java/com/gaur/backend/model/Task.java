package com.gaur.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Locale;

@Entity
@Table(name = "task", indexes = {
        @Index(name = "idx_task_user_done", columnList = "user_id, done"),
        @Index(name = "idx_task_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_task_user_date", columnList = "user_id, task_date"),
        @Index(name = "idx_task_user_sync", columnList = "user_id, source_slot_id, sync_date")
})
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(length = 64)
    private String tag;

    @Column(name = "time_label", length = 64)
    private String time;

    @Column(length = 16)
    private String priority;

    @Column(nullable = false)
    private Boolean done = Boolean.FALSE;

    @Column(name = "ai_synced")
    private Boolean aiSynced = Boolean.FALSE;

    @Column(name = "dismissed")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Boolean dismissed = Boolean.FALSE;

    @Column(name = "source_slot_id")
    private Long sourceSlotId;

    @Column(name = "sync_date")
    private LocalDate syncDate;

    @Column(name = "task_date")
    private LocalDate taskDate;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (priority == null) priority = "Medium";
        if (tag == null) tag = "Daily";
        if (time == null) time = "30m";
        if (taskDate == null) {
            taskDate = syncDate != null ? syncDate : LocalDate.now();
        }
        if (done == null) done = Boolean.FALSE;
        if (aiSynced == null) aiSynced = Boolean.FALSE;
        if (dismissed == null) dismissed = Boolean.FALSE;
        if (Boolean.TRUE.equals(done) && completedAt == null) completedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public boolean isDone() { return Boolean.TRUE.equals(done); }
    public void setDone(Boolean done) { this.done = done; }
    public boolean isAiSynced() { return Boolean.TRUE.equals(aiSynced); }
    public void setAiSynced(Boolean aiSynced) { this.aiSynced = aiSynced; }
    public boolean isDismissed() { return Boolean.TRUE.equals(dismissed); }
    public void setDismissed(Boolean dismissed) { this.dismissed = dismissed; }
    public Long getSourceSlotId() { return sourceSlotId; }
    public void setSourceSlotId(Long sourceSlotId) { this.sourceSlotId = sourceSlotId; }
    public LocalDate getSyncDate() { return syncDate; }
    public void setSyncDate(LocalDate syncDate) { this.syncDate = syncDate; }
    public LocalDate getTaskDate() { return taskDate; }
    public void setTaskDate(LocalDate taskDate) { this.taskDate = taskDate; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    @Transient
    @JsonProperty("weekday")
    public String getWeekday() {
        LocalDate date = effectiveDate();
        if (date == null) return null;
        String full = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.US);
        return full.substring(0, Math.min(3, full.length()));
    }

    @Transient
    @JsonProperty("effectiveDate")
    public LocalDate effectiveDate() {
        if (taskDate != null) return taskDate;
        if (syncDate != null) return syncDate;
        if (createdAt == null) return null;
        return createdAt.atZone(ZoneId.systemDefault()).toLocalDate();
    }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
