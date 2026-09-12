package com.gaur.backend.service;

import com.gaur.backend.dto.ScheduleSlotRequest;
import com.gaur.backend.model.AppUser;
import com.gaur.backend.model.ScheduleSlot;
import com.gaur.backend.repository.ScheduleSlotRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ScheduleService {

    private static final DateTimeFormatter[] CLOCK_FORMATS = new DateTimeFormatter[] {
            DateTimeFormatter.ofPattern("hh:mm a", Locale.US),
            DateTimeFormatter.ofPattern("h:mm a", Locale.US),
            DateTimeFormatter.ofPattern("HH:mm", Locale.US)
    };

    private final ScheduleSlotRepository slotRepo;
    private final UserService userService;

    public ScheduleService(ScheduleSlotRepository slotRepo, UserService userService) {
        this.slotRepo = slotRepo;
        this.userService = userService;
    }

    @Cacheable(value = "schedule", key = "#username")
    public List<ScheduleSlot> list(String username) {
        AppUser user = userService.requireByUsername(username);
        return slotRepo.findByUserIdOrderByTimeAsc(user.getId());
    }

    public List<ScheduleSlot> listForDay(String username, String day) {
        List<ScheduleSlot> all = list(username);
        if (day == null || day.isBlank() || "all".equalsIgnoreCase(day)) {
            return all;
        }
        String d = day.trim();
        return all.stream()
                .filter(s -> "all".equalsIgnoreCase(s.getDay()) || d.equalsIgnoreCase(s.getDay()))
                .sorted(Comparator.comparing(ScheduleSlot::getTime, Comparator.nullsLast(String::compareTo)))
                .toList();
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "schedule", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username"),
            @CacheEvict(value = "tasks", key = "#username")
    })
    public ScheduleSlot create(String username, ScheduleSlotRequest req) {
        AppUser user = userService.requireByUsername(username);
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        ScheduleSlot slot = new ScheduleSlot();
        slot.setUserId(user.getId());
        apply(slot, req);
        return slotRepo.save(slot);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "schedule", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username"),
            @CacheEvict(value = "tasks", key = "#username")
    })
    public ScheduleSlot update(String username, Long id, ScheduleSlotRequest req) {
        AppUser user = userService.requireByUsername(username);
        ScheduleSlot slot = slotRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schedule slot not found"));
        apply(slot, req);
        return slotRepo.save(slot);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "schedule", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username"),
            @CacheEvict(value = "tasks", key = "#username")
    })
    public void delete(String username, Long id) {
        AppUser user = userService.requireByUsername(username);
        ScheduleSlot slot = slotRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schedule slot not found"));
        slotRepo.delete(slot);
    }

    public List<Map<String, Object>> todayTimeline(String username) {
        String today = weekdayAbbrev();
        LocalTime now = LocalTime.now();
        List<ScheduleSlot> slots = new ArrayList<>(listForDay(username, today));
        slots.sort(Comparator.comparing(s -> parseClock(s.getTime()), Comparator.nullsLast(LocalTime::compareTo)));

        List<Map<String, Object>> out = new ArrayList<>();
        for (ScheduleSlot slot : slots) {
            LocalTime start = parseClock(slot.getTime());
            LocalTime end = parseClock(slot.getEndTime());
            String status = deriveStatus(slot.getCategory(), start, end, now);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", slot.getId());
            row.put("time", slot.getTime() + " – " + slot.getEndTime());
            row.put("startTime", slot.getTime());
            row.put("endTime", slot.getEndTime());
            row.put("title", slot.getTitle());
            row.put("desc", slot.getDesc());
            row.put("category", slot.getCategory());
            row.put("day", slot.getDay());
            row.put("status", status);
            out.add(row);
        }
        return out;
    }

    public static String weekdayAbbrev() {
        return switch (java.time.LocalDate.now().getDayOfWeek()) {
            case MONDAY -> "Mon";
            case TUESDAY -> "Tue";
            case WEDNESDAY -> "Wed";
            case THURSDAY -> "Thu";
            case FRIDAY -> "Fri";
            case SATURDAY -> "Sat";
            case SUNDAY -> "Sun";
        };
    }

    public static LocalTime parseClock(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String value = raw.trim().toUpperCase(Locale.US).replace(".", "");
        for (DateTimeFormatter fmt : CLOCK_FORMATS) {
            try {
                return LocalTime.parse(value, fmt);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private static String deriveStatus(String category, LocalTime start, LocalTime end, LocalTime now) {
        if (start != null && end != null) {
            if (!now.isBefore(start) && !now.isAfter(end)) return "active";
            if (now.isAfter(end)) return "done";
        }
        if ("interview".equalsIgnoreCase(category)) return "focus";
        if ("health".equalsIgnoreCase(category)) return "rest";
        return "upcoming";
    }

    private static void apply(ScheduleSlot slot, ScheduleSlotRequest req) {
        if (req.getTitle() != null) slot.setTitle(req.getTitle().trim());
        if (req.getDesc() != null) slot.setDesc(req.getDesc());
        if (req.getTime() != null && !req.getTime().isBlank()) slot.setTime(req.getTime().trim());
        if (req.getEndTime() != null && !req.getEndTime().isBlank()) slot.setEndTime(req.getEndTime().trim());
        if (req.getCategory() != null && !req.getCategory().isBlank()) slot.setCategory(req.getCategory().trim().toLowerCase(Locale.ROOT));
        if (req.getDay() != null && !req.getDay().isBlank()) slot.setDay(normalizeDay(req.getDay()));
        if (slot.getTime() == null) slot.setTime("09:00 AM");
        if (slot.getEndTime() == null) slot.setEndTime("10:00 AM");
    }

    private static String normalizeDay(String day) {
        String d = day.trim();
        if ("all".equalsIgnoreCase(d)) return "all";
        String cap = d.substring(0, 1).toUpperCase(Locale.ROOT) + d.substring(1).toLowerCase(Locale.ROOT);
        return switch (cap) {
            case "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" -> cap;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "day must be all or Mon–Sun");
        };
    }
}
