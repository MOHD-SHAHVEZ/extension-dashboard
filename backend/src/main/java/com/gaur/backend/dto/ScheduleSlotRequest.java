package com.gaur.backend.dto;

public class ScheduleSlotRequest {
    private String time;
    private String endTime;
    private String title;
    private String desc;
    private String category;
    private String day;

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
}
