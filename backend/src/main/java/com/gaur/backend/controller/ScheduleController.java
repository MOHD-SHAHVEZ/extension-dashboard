package com.gaur.backend.controller;

import com.gaur.backend.dto.AiTimetableApplyRequest;
import com.gaur.backend.dto.AiTimetableRequest;
import com.gaur.backend.dto.AiTimetableResponse;
import com.gaur.backend.dto.ScheduleSlotRequest;
import com.gaur.backend.model.ScheduleSlot;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.ScheduleAiService;
import com.gaur.backend.service.ScheduleService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;
    private final ScheduleAiService scheduleAiService;

    public ScheduleController(ScheduleService scheduleService, ScheduleAiService scheduleAiService) {
        this.scheduleService = scheduleService;
        this.scheduleAiService = scheduleAiService;
    }

    @GetMapping
    public List<ScheduleSlot> list(@RequestParam(name = "day", required = false) String day) {
        String username = SecurityUtils.currentUsername();
        if (day == null || day.isBlank()) {
            return scheduleService.list(username);
        }
        return scheduleService.listForDay(username, day);
    }

    @GetMapping("/today")
    public List<Map<String, Object>> today() {
        return scheduleService.todayTimeline(SecurityUtils.currentUsername());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleSlot create(@RequestBody ScheduleSlotRequest req) {
        return scheduleService.create(SecurityUtils.currentUsername(), req);
    }

    @PutMapping("/{id}")
    public ScheduleSlot update(@PathVariable Long id, @RequestBody ScheduleSlotRequest req) {
        return scheduleService.update(SecurityUtils.currentUsername(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        scheduleService.delete(SecurityUtils.currentUsername(), id);
    }

    @PostMapping("/ai-plan")
    public AiTimetableResponse plan(@RequestBody AiTimetableRequest request) {
        return scheduleAiService.generate(request);
    }

    @PostMapping("/ai-plan/apply")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ScheduleSlot> applyPlan(@RequestBody AiTimetableApplyRequest request) {
        return scheduleAiService.apply(SecurityUtils.currentUsername(), request);
    }
}
