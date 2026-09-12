package com.gaur.backend.repository;

import com.gaur.backend.model.ScheduleSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScheduleSlotRepository extends JpaRepository<ScheduleSlot, Long> {

    List<ScheduleSlot> findByUserIdOrderByTimeAsc(Long userId);

    List<ScheduleSlot> findByUserIdAndDayInOrderByTimeAsc(Long userId, List<String> days);

    Optional<ScheduleSlot> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    void deleteByUserId(Long userId);
}
