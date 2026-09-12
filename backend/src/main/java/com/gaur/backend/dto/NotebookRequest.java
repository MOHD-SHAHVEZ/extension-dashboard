package com.gaur.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class NotebookRequest {

    @NotBlank
    @Size(max = 80)
    private String subjectName;

    @Pattern(regexp = "^$|^#([0-9A-Fa-f]{6})$", message = "must be a hex color like #4F46E5")
    private String color;

    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
