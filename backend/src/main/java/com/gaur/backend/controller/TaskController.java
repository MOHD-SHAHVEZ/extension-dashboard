package com.gaur.backend.controller;

import com.gaur.backend.dto.TaskHistoryResponse;
import com.gaur.backend.dto.TaskRequest;
import com.gaur.backend.model.Task;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<Task> list(
            @RequestParam(name = "scope", required = false, defaultValue = "all") String scope,
            @RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "year", required = false) Integer year,
            @RequestParam(name = "month", required = false) Integer month,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "day", required = false) String day
    ) {
        if (hasHistoryFilter(date, year, month, from, to, day)) {
            TaskService.LocalDateRange range = TaskService.resolveRange(date, year, month, from, to);
            return taskService.history(SecurityUtils.currentUsername(), range.from(), range.to(), day).getTasks();
        }
        return taskService.list(SecurityUtils.currentUsername(), scope);
    }

    @GetMapping("/history")
    public TaskHistoryResponse history(
            @RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "year", required = false) Integer year,
            @RequestParam(name = "month", required = false) Integer month,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "day", required = false) String day
    ) {
        TaskService.LocalDateRange range = TaskService.resolveRange(date, year, month, from, to);
        return taskService.history(SecurityUtils.currentUsername(), range.from(), range.to(), day);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task create(@RequestBody TaskRequest req) {
        return taskService.create(SecurityUtils.currentUsername(), req);
    }

    @PutMapping("/{id}")
    public Task replace(@PathVariable Long id, @RequestBody TaskRequest req) {
        return taskService.update(SecurityUtils.currentUsername(), id, req);
    }

    @PatchMapping("/{id}")
    public Task patch(@PathVariable Long id, @RequestBody TaskRequest req) {
        return taskService.update(SecurityUtils.currentUsername(), id, req);
    }

    @DeleteMapping("/completed")
    public Map<String, Object> deleteCompleted(
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to
    ) {
        LocalDate fromDate = from != null && !from.isBlank() ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null && !to.isBlank() ? LocalDate.parse(to) : null;
        int removed = taskService.deleteCompleted(SecurityUtils.currentUsername(), fromDate, toDate);
        return Map.of("deleted", removed);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        taskService.delete(SecurityUtils.currentUsername(), id);
    }

    private static boolean hasHistoryFilter(String date, Integer year, Integer month, String from, String to, String day) {
        return (date != null && !date.isBlank())
                || year != null
                || month != null
                || (from != null && !from.isBlank())
                || (to != null && !to.isBlank())
                || (day != null && !day.isBlank());
    }
}
