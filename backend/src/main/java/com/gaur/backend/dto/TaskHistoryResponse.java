package com.gaur.backend.dto;

import com.gaur.backend.model.Task;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class TaskHistoryResponse {
    private LocalDate from;
    private LocalDate to;
    private String weekday;
    private long total;
    private long completed;
    private long remaining;
    private List<Task> tasks = new ArrayList<>();
    private List<DaySummary> days = new ArrayList<>();

    public LocalDate getFrom() { return from; }
    public void setFrom(LocalDate from) { this.from = from; }
    public LocalDate getTo() { return to; }
    public void setTo(LocalDate to) { this.to = to; }
    public String getWeekday() { return weekday; }
    public void setWeekday(String weekday) { this.weekday = weekday; }
    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }
    public long getCompleted() { return completed; }
    public void setCompleted(long completed) { this.completed = completed; }
    public long getRemaining() { return remaining; }
    public void setRemaining(long remaining) { this.remaining = remaining; }
    public List<Task> getTasks() { return tasks; }
    public void setTasks(List<Task> tasks) { this.tasks = tasks; }
    public List<DaySummary> getDays() { return days; }
    public void setDays(List<DaySummary> days) { this.days = days; }

    public static class DaySummary {
        private LocalDate date;
        private String weekday;
        private long total;
        private long completed;
        private long remaining;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }
        public String getWeekday() { return weekday; }
        public void setWeekday(String weekday) { this.weekday = weekday; }
        public long getTotal() { return total; }
        public void setTotal(long total) { this.total = total; }
        public long getCompleted() { return completed; }
        public void setCompleted(long completed) { this.completed = completed; }
        public long getRemaining() { return remaining; }
        public void setRemaining(long remaining) { this.remaining = remaining; }
    }
}
