package com.gaur.backend.service;

import com.gaur.backend.model.ScheduleSlot;
import com.gaur.backend.model.Task;
import com.gaur.backend.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ScheduleTaskSyncService {

    private final TaskRepository taskRepo;
    private final ScheduleService scheduleService;

    public ScheduleTaskSyncService(TaskRepository taskRepo, ScheduleService scheduleService) {
        this.taskRepo = taskRepo;
        this.scheduleService = scheduleService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncToday(Long userId, String username) {
        LocalDate today = LocalDate.now();
        String weekday = ScheduleService.weekdayAbbrev();
        List<ScheduleSlot> slots = scheduleService.listForDay(username, weekday);
        Set<Long> seen = new HashSet<>();
        for (ScheduleSlot slot : slots) {
            if (slot.getId() == null || !seen.add(slot.getId())) continue;
            if (taskRepo.existsByUserIdAndSourceSlotIdAndSyncDate(userId, slot.getId(), today)) {
                continue;
            }
            Task task = new Task();
            task.setUserId(userId);
            task.setTitle("[Schedule] " + slot.getTitle());
            task.setTag("Daily Goal");
            task.setTime(slot.getTime() + " - " + slot.getEndTime());
            task.setPriority("High");
            task.setDone(false);
            task.setSourceSlotId(slot.getId());
            task.setSyncDate(today);
            task.setTaskDate(today);
            taskRepo.saveAndFlush(task);
        }
    }
}
