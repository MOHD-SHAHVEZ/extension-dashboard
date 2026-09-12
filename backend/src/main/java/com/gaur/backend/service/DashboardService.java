package com.gaur.backend.service;

import com.gaur.backend.model.Summary;
import com.gaur.backend.model.Task;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final TaskService taskService;
    private final ScheduleService scheduleService;
    private final SummaryService summaryService;
    private final UserService userService;

    public DashboardService(TaskService taskService, ScheduleService scheduleService, SummaryService summaryService, UserService userService) {
        this.taskService = taskService;
        this.scheduleService = scheduleService;
        this.summaryService = summaryService;
        this.userService = userService;
    }

    @Cacheable(value = "dashboard", key = "#username")
    public Map<String, Object> load(String username) {
        List<Task> tasks = taskService.list(username, "today");
        List<Map<String, Object>> schedule = scheduleService.todayTimeline(username);
        List<Summary> summaries = summaryService.findByOwner(username);
        if (summaries.size() > 6) {
            summaries = summaries.subList(0, 6);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tasks", tasks);
        body.put("schedule", schedule);
        body.put("summaries", summaries);
        body.put("focusTitle", focusTitle(schedule));
        body.put("nextLabel", nextLabel(schedule));
        
        userService.findByUsername(username).ifPresent(user -> {
            body.put("firstName", user.getFirstName());
            body.put("lastName", user.getLastName());
        });

        return body;
    }

    private static String focusTitle(List<Map<String, Object>> schedule) {
        for (Map<String, Object> slot : schedule) {
            if ("active".equals(slot.get("status")) || "focus".equals(slot.get("status"))) {
                return String.valueOf(slot.get("title"));
            }
        }
        return schedule.isEmpty() ? "Today's goals" : String.valueOf(schedule.get(0).get("title"));
    }

    private static String nextLabel(List<Map<String, Object>> schedule) {
        for (Map<String, Object> slot : schedule) {
            String status = String.valueOf(slot.get("status"));
            if ("active".equals(status) || "upcoming".equals(status) || "focus".equals(status)) {
                Object start = slot.get("startTime");
                Object title = slot.get("title");
                return "Next: " + title + (start != null ? " at " + start : "");
            }
        }
        return "Schedule clear for now";
    }
}
