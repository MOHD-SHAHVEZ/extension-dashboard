package com.gaur.backend.service;

import com.gaur.backend.dto.TaskHistoryResponse;
import com.gaur.backend.dto.TaskRequest;
import com.gaur.backend.model.AppUser;
import com.gaur.backend.model.Task;
import com.gaur.backend.repository.TaskRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TaskService {

    private final TaskRepository taskRepo;
    private final UserService userService;
    private final ScheduleTaskSyncService scheduleTaskSyncService;

    public TaskService(TaskRepository taskRepo, UserService userService, ScheduleTaskSyncService scheduleTaskSyncService) {
        this.taskRepo = taskRepo;
        this.userService = userService;
        this.scheduleTaskSyncService = scheduleTaskSyncService;
    }

    @Transactional
    public List<Task> list(String username, String scope) {
        LocalDate today = LocalDate.now();
        if ("today".equalsIgnoreCase(scope)) {
            return history(username, today, today, null).getTasks();
        }
        AppUser user = userService.requireByUsername(username);
        syncTodayFromSchedule(user.getId(), username);
        return taskRepo.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    public TaskHistoryResponse history(String username, LocalDate from, LocalDate to, String weekday) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from and to dates are required");
        }
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from must be on or before to");
        }

        AppUser user = userService.requireByUsername(username);
        LocalDate today = LocalDate.now();
        if (!today.isBefore(from) && !today.isAfter(to)) {
            syncTodayFromSchedule(user.getId(), username);
        }

        ZoneId zone = ZoneId.systemDefault();
        Instant fromInstant = from.atStartOfDay(zone).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(zone).toInstant();
        List<Task> tasks = new ArrayList<>(taskRepo.findHistory(user.getId(), from, to, fromInstant, toInstant));

        String dayFilter = normalizeWeekday(weekday);
        if (dayFilter != null) {
            tasks = tasks.stream()
                    .filter(t -> dayFilter.equalsIgnoreCase(t.getWeekday()))
                    .toList();
        }

        tasks = tasks.stream()
                .sorted(Comparator
                        .comparing(Task::effectiveDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Task::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        long completed = tasks.stream().filter(Task::isDone).count();
        TaskHistoryResponse resp = new TaskHistoryResponse();
        resp.setFrom(from);
        resp.setTo(to);
        resp.setWeekday(dayFilter);
        resp.setTotal(tasks.size());
        resp.setCompleted(completed);
        resp.setRemaining(tasks.size() - completed);
        resp.setTasks(tasks);
        resp.setDays(buildDaySummaries(tasks));
        return resp;
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "tasks", allEntries = true),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public Task create(String username, TaskRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        AppUser user = userService.requireByUsername(username);
        Task task = new Task();
        task.setUserId(user.getId());
        apply(task, req, true);
        return taskRepo.save(task);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "tasks", allEntries = true),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public Task update(String username, Long id, TaskRequest req) {
        AppUser user = userService.requireByUsername(username);
        Task task = taskRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        apply(task, req, false);
        return taskRepo.save(task);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "tasks", allEntries = true),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public void delete(String username, Long id) {
        AppUser user = userService.requireByUsername(username);
        Task task = taskRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        // Schedule-copied rows must stay (dismissed) so today's sync does not recreate them.
        if (task.getSourceSlotId() != null) {
            task.setDismissed(true);
            taskRepo.save(task);
            return;
        }
        taskRepo.delete(task);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "tasks", allEntries = true),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public int deleteCompleted(String username, LocalDate from, LocalDate to) {
        AppUser user = userService.requireByUsername(username);
        if (from == null || to == null) {
            return taskRepo.deleteCompletedByUserId(user.getId());
        }
        ZoneId zone = ZoneId.systemDefault();
        Instant fromInstant = from.atStartOfDay(zone).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(zone).toInstant();
        return taskRepo.deleteCompletedInRange(user.getId(), from, to, fromInstant, toInstant);
    }

    public static LocalDateRange resolveRange(String date, Integer year, Integer month, String from, String to) {
        if (date != null && !date.isBlank()) {
            LocalDate day = LocalDate.parse(date);
            return new LocalDateRange(day, day);
        }
        if (from != null && !from.isBlank() && to != null && !to.isBlank()) {
            return new LocalDateRange(LocalDate.parse(from), LocalDate.parse(to));
        }
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            return new LocalDateRange(ym.atDay(1), ym.atEndOfMonth());
        }
        YearMonth current = YearMonth.now();
        return new LocalDateRange(current.atDay(1), current.atEndOfMonth());
    }

    public record LocalDateRange(LocalDate from, LocalDate to) {}

    private void syncTodayFromSchedule(Long userId, String username) {
        try {
            scheduleTaskSyncService.syncToday(userId, username);
        } catch (DataIntegrityViolationException ignored) {
            // parallel dashboard/tasks request already copied today's schedule
        }
    }

    private static void apply(Task task, TaskRequest req, boolean creating) {
        if (req.getTitle() != null) task.setTitle(req.getTitle().trim());
        if (req.getTag() != null) task.setTag(req.getTag().trim());
        if (req.getTime() != null) task.setTime(req.getTime().trim());
        if (req.getPriority() != null) task.setPriority(normalizePriority(req.getPriority()));
        if (req.getAiSynced() != null) task.setAiSynced(req.getAiSynced());
        if (req.getTaskDate() != null && !req.getTaskDate().isBlank()) {
            task.setTaskDate(LocalDate.parse(req.getTaskDate()));
        }
        if (req.getDone() != null) {
            task.setDone(req.getDone());
            if (req.getDone()) {
                if (task.getCompletedAt() == null) task.setCompletedAt(Instant.now());
            } else {
                task.setCompletedAt(null);
            }
        }
        if (creating) {
            if (task.getTag() == null) task.setTag("Daily");
            if (task.getTime() == null) task.setTime("30m");
            if (task.getPriority() == null) task.setPriority("Medium");
            if (task.getTaskDate() == null) task.setTaskDate(LocalDate.now());
        }
    }

    private static String normalizePriority(String priority) {
        String p = priority.trim();
        String cap = p.substring(0, 1).toUpperCase(Locale.ROOT) + p.substring(1).toLowerCase(Locale.ROOT);
        return switch (cap) {
            case "High", "Medium", "Low", "Done" -> cap;
            default -> "Medium";
        };
    }

    private static String normalizeWeekday(String weekday) {
        if (weekday == null || weekday.isBlank() || "all".equalsIgnoreCase(weekday)) return null;
        String cap = weekday.trim();
        cap = cap.substring(0, 1).toUpperCase(Locale.ROOT) + cap.substring(1).toLowerCase(Locale.ROOT);
        return switch (cap) {
            case "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" -> cap;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "day must be Mon–Sun");
        };
    }

    private static List<TaskHistoryResponse.DaySummary> buildDaySummaries(List<Task> tasks) {
        Map<LocalDate, TaskHistoryResponse.DaySummary> byDate = new LinkedHashMap<>();
        for (Task task : tasks) {
            LocalDate date = task.effectiveDate();
            if (date == null) continue;
            TaskHistoryResponse.DaySummary bucket = byDate.computeIfAbsent(date, d -> {
                TaskHistoryResponse.DaySummary s = new TaskHistoryResponse.DaySummary();
                s.setDate(d);
                s.setWeekday(task.getWeekday());
                return s;
            });
            bucket.setTotal(bucket.getTotal() + 1);
            if (task.isDone()) bucket.setCompleted(bucket.getCompleted() + 1);
            bucket.setRemaining(bucket.getTotal() - bucket.getCompleted());
        }
        List<TaskHistoryResponse.DaySummary> days = new ArrayList<>(byDate.values());
        days.sort(Comparator.comparing(TaskHistoryResponse.DaySummary::getDate).reversed());
        return days;
    }
}
