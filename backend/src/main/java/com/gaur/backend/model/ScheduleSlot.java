package com.gaur.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "schedule_slot", indexes = {
        @Index(name = "idx_slot_user_day", columnList = "user_id, day_code"),
        @Index(name = "idx_slot_user", columnList = "user_id")
})
public class ScheduleSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @JsonProperty("time")
    @Column(name = "start_time", nullable = false, length = 32)
    private String time;

    @JsonProperty("endTime")
    @Column(name = "end_time", nullable = false, length = 32)
    private String endTime;

    @Column(nullable = false, length = 255)
    private String title;

    @JsonProperty("desc")
    @Column(name = "description", length = 2000)
    private String desc;

    @Column(nullable = false, length = 32)
    private String category;

    @JsonProperty("day")
    @Column(name = "day_code", nullable = false, length = 8)
    private String day;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (category == null) category = "work";
        if (day == null) day = "all";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isRecurringDaily() {
        return "all".equalsIgnoreCase(day);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDesc() { return desc; }
    public void setDesc(String desc) { this.desc = desc; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
