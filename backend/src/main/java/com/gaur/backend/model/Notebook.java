package com.gaur.backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "notebook", indexes = {
        @Index(name = "idx_notebook_owner_created", columnList = "owner, created_at")
})
public class Notebook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_name", nullable = false, length = 80)
    private String subjectName;

    @Column(length = 16, nullable = false)
    private String color;

    @Column(nullable = false, length = 255)
    private String owner;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "notebook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LessonNote> lessons = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (color == null || color.isBlank()) color = "#4F46E5";
    }

    public void addLesson(LessonNote lesson) {
        lessons.add(lesson);
        lesson.setNotebook(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<LessonNote> getLessons() { return lessons; }
    public void setLessons(List<LessonNote> lessons) { this.lessons = lessons; }
}
