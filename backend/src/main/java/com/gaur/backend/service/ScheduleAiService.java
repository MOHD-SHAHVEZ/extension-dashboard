package com.gaur.backend.service;

import com.gaur.backend.ai.GeneratedTimetable;
import com.gaur.backend.ai.GeneratedTimetableSlot;
import com.gaur.backend.ai.SpringAiTimetablePlanner;
import com.gaur.backend.dto.AiTimetableApplyRequest;
import com.gaur.backend.dto.AiTimetableRequest;
import com.gaur.backend.dto.AiTimetableResponse;
import com.gaur.backend.dto.ScheduleSlotRequest;
import com.gaur.backend.model.AppUser;
import com.gaur.backend.model.ScheduleSlot;
import com.gaur.backend.repository.ScheduleSlotRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ScheduleAiService {

    private static final Set<String> CATEGORIES = Set.of("study", "work", "project", "interview", "health");
    private static final int MAX_SLOTS = 42;

    private final SpringAiTimetablePlanner planner;
    private final ScheduleService scheduleService;
    private final ScheduleSlotRepository slotRepo;
    private final UserService userService;

    public ScheduleAiService(
            SpringAiTimetablePlanner planner,
            ScheduleService scheduleService,
            ScheduleSlotRepository slotRepo,
            UserService userService
    ) {
        this.planner = planner;
        this.scheduleService = scheduleService;
        this.slotRepo = slotRepo;
        this.userService = userService;
    }

    public AiTimetableResponse generate(AiTimetableRequest request) {
        String routine = request.getGoals() == null ? "" : request.getGoals().trim();
        String subjectBudget = formatSubjectHours(request.getSubjectHours());
        if (subjectBudget.equals("No per-subject hour budget given.")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one subject first");
        }
        if (routine.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Write your daily routine first");
        }
        boolean weekends = Boolean.TRUE.equals(request.getIncludeWeekends())
                || routine.toLowerCase(Locale.ROOT).contains("sat")
                || routine.toLowerCase(Locale.ROOT).contains("sun")
                || routine.toLowerCase(Locale.ROOT).contains("weekend");
        double dailyHours = sumWeeklyHours(request.getSubjectHours());
        if (dailyHours < 0.5 || dailyHours > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Study hours look unrealistic. Check subject time.");
        }

        String prompt = """
                Student's complete daily routine:
                %s

                Subjects and daily study time:
                %s

                Total study wanted each day: %.1f hours
                Include Saturday/Sunday: %s

                Build a daily timetable around this routine.
                Keep college/job/gym/sleep as written.
                Fit subjects into free time only.
                Repeat the weekday plan for Mon-Fri.
                """.formatted(
                routine,
                subjectBudget,
                dailyHours,
                weekends ? "only if the routine mentions them" : "no, Mon-Fri only"
        );

        GeneratedTimetable plan = planner.plan(prompt);
        AiTimetableResponse out = new AiTimetableResponse();
        out.setSummary(plan.summary() == null ? "Here is a weekly plan based on your goals." : plan.summary());
        List<ScheduleSlotRequest> slots = new ArrayList<>();
        for (GeneratedTimetableSlot row : plan.slots()) {
            ScheduleSlotRequest mapped = toRequest(row);
            if (mapped != null && (weekends || isWeekday(mapped.getDay()))) {
                slots.add(mapped);
            }
            if (slots.size() >= MAX_SLOTS) break;
        }
        if (slots.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI returned no usable timetable slots");
        }
        out.setSlots(slots);
        return out;
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "schedule", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username"),
            @CacheEvict(value = "tasks", key = "#username")
    })
    public List<ScheduleSlot> apply(String username, AiTimetableApplyRequest request) {
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No timetable slots to apply");
        }
        AppUser user = userService.requireByUsername(username);
        if (request.isReplaceExisting()) {
            slotRepo.deleteByUserId(user.getId());
        }
        List<ScheduleSlot> saved = new ArrayList<>();
        int count = 0;
        for (ScheduleSlotRequest slot : request.getSlots()) {
            if (slot == null || slot.getTitle() == null || slot.getTitle().isBlank()) continue;
            saved.add(scheduleService.create(username, slot));
            count += 1;
            if (count >= MAX_SLOTS) break;
        }
        if (saved.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid slots to save");
        }
        return saved;
    }

    private static ScheduleSlotRequest toRequest(GeneratedTimetableSlot row) {
        if (row == null || row.title() == null || row.title().isBlank()) return null;
        ScheduleSlotRequest req = new ScheduleSlotRequest();
        req.setTitle(row.title().trim());
        req.setDesc(row.desc() == null ? "" : row.desc().trim());
        req.setTime(blankTo(row.time(), "09:00 AM"));
        req.setEndTime(blankTo(row.endTime(), "10:00 AM"));
        String category = row.category() == null ? "study" : row.category().trim().toLowerCase(Locale.ROOT);
        req.setCategory(CATEGORIES.contains(category) ? category : "study");
        String day = row.day() == null ? "Mon" : row.day().trim();
        if ("all".equalsIgnoreCase(day)) day = "Mon";
        req.setDay(day);
        return req;
    }

    private static boolean isWeekday(String day) {
        return switch (day) {
            case "Mon", "Tue", "Wed", "Thu", "Fri" -> true;
            default -> false;
        };
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static double sumWeeklyHours(List<AiTimetableRequest.SubjectHour> hours) {
        if (hours == null) return 0;
        double total = 0;
        for (AiTimetableRequest.SubjectHour row : hours) {
            if (row == null || row.getName() == null || row.getName().isBlank()) continue;
            if (row.getHoursPerWeek() != null && row.getHoursPerWeek() > 0) {
                total += row.getHoursPerWeek();
            }
        }
        return total;
    }

    private static String formatSubjectHours(List<AiTimetableRequest.SubjectHour> hours) {
        if (hours == null || hours.isEmpty()) return "No per-subject hour budget given.";
        StringBuilder sb = new StringBuilder();
        for (AiTimetableRequest.SubjectHour row : hours) {
            if (row == null || row.getName() == null || row.getName().isBlank()) continue;
            double value = row.getHoursPerWeek() == null ? 0 : row.getHoursPerWeek();
            if (value <= 0) continue;
            sb.append("- ").append(row.getName().trim()).append(": ").append(value).append(" hours per day\n");
        }
        return sb.isEmpty() ? "No per-subject hour budget given." : sb.toString().trim();
    }

    private static String formatBusyWindows(List<AiTimetableRequest.BusyWindow> windows) {
        if (windows == null || windows.isEmpty()) return "None given.";
        StringBuilder sb = new StringBuilder();
        for (AiTimetableRequest.BusyWindow row : windows) {
            if (row == null) continue;
            String start = row.getStartTime() == null ? "" : row.getStartTime().trim();
            String end = row.getEndTime() == null ? "" : row.getEndTime().trim();
            if (start.isBlank() || end.isBlank()) continue;
            String days = switch (blankTo(row.getDays(), "weekdays").toLowerCase(Locale.ROOT)) {
                case "weekends" -> "Saturday and Sunday";
                case "everyday", "all" -> "every day";
                default -> "Monday to Friday";
            };
            sb.append("- Busy ").append(days).append(" from ").append(start).append(" to ").append(end).append('\n');
        }
        return sb.isEmpty() ? "None given." : sb.toString().trim();
    }
}
