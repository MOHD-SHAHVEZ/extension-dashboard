package com.gaur.backend.dto;

public class TaskRequest {
    private String title;
    private String tag;
    private String time;
    private String priority;
    private Boolean done;
    private Boolean aiSynced;
    private String taskDate;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public Boolean getDone() { return done; }
    public void setDone(Boolean done) { this.done = done; }
    public Boolean getAiSynced() { return aiSynced; }
    public void setAiSynced(Boolean aiSynced) { this.aiSynced = aiSynced; }
    public String getTaskDate() { return taskDate; }
    public void setTaskDate(String taskDate) { this.taskDate = taskDate; }
}
