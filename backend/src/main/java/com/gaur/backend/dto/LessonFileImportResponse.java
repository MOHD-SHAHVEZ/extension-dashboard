package com.gaur.backend.dto;

public class LessonFileImportResponse {
    private String fileName;
    private String kind;
    private String suggestedTitle;
    private String text;

    public LessonFileImportResponse() {}

    public LessonFileImportResponse(String fileName, String kind, String suggestedTitle, String text) {
        this.fileName = fileName;
        this.kind = kind;
        this.suggestedTitle = suggestedTitle;
        this.text = text;
    }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getSuggestedTitle() { return suggestedTitle; }
    public void setSuggestedTitle(String suggestedTitle) { this.suggestedTitle = suggestedTitle; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
