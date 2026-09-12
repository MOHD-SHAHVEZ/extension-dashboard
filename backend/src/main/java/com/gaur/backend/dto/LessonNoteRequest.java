package com.gaur.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LessonNoteRequest {

    @NotBlank
    @Size(max = 200)
    private String lessonTitle;

    private String content;

    public String getLessonTitle() { return lessonTitle; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
