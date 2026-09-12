package com.gaur.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class AiTimetableRequest {
    private String goals;
    private Double dailyHours;
    private String wakeTime;
    private String sleepTime;
    private Boolean includeWeekends;
    private List<SubjectHour> subjectHours = new ArrayList<>();
    private List<BusyWindow> busyWindows = new ArrayList<>();

    public String getGoals() { return goals; }
    public void setGoals(String goals) { this.goals = goals; }
    public Double getDailyHours() { return dailyHours; }
    public void setDailyHours(Double dailyHours) { this.dailyHours = dailyHours; }
    public String getWakeTime() { return wakeTime; }
    public void setWakeTime(String wakeTime) { this.wakeTime = wakeTime; }
    public String getSleepTime() { return sleepTime; }
    public void setSleepTime(String sleepTime) { this.sleepTime = sleepTime; }
    public Boolean getIncludeWeekends() { return includeWeekends; }
    public void setIncludeWeekends(Boolean includeWeekends) { this.includeWeekends = includeWeekends; }
    public List<SubjectHour> getSubjectHours() { return subjectHours; }
    public void setSubjectHours(List<SubjectHour> subjectHours) {
        this.subjectHours = subjectHours != null ? subjectHours : new ArrayList<>();
    }
    public List<BusyWindow> getBusyWindows() { return busyWindows; }
    public void setBusyWindows(List<BusyWindow> busyWindows) {
        this.busyWindows = busyWindows != null ? busyWindows : new ArrayList<>();
    }

    public static class SubjectHour {
        private String name;
        private Double hoursPerWeek;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Double getHoursPerWeek() { return hoursPerWeek; }
        public void setHoursPerWeek(Double hoursPerWeek) { this.hoursPerWeek = hoursPerWeek; }
    }

    public static class BusyWindow {
        private String startTime;
        private String endTime;
        private String days;

        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }
        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }
        public String getDays() { return days; }
        public void setDays(String days) { this.days = days; }
    }
}
