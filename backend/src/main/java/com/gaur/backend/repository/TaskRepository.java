package com.gaur.backend.repository;

import com.gaur.backend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("""
            select t from Task t
            where t.userId = :userId
              and (t.dismissed is null or t.dismissed = false)
            order by t.createdAt desc
            """)
    List<Task> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndSourceSlotIdAndSyncDate(Long userId, Long sourceSlotId, LocalDate syncDate);

    @Query("""
            select t from Task t
            where t.userId = :userId
              and (t.dismissed is null or t.dismissed = false)
              and (
                    (t.taskDate is not null and t.taskDate between :fromDate and :toDate)
                 or (t.taskDate is null and t.syncDate is not null and t.syncDate between :fromDate and :toDate)
                 or (t.taskDate is null and t.syncDate is null and t.createdAt >= :fromInstant and t.createdAt < :toInstant)
              )
            order by t.createdAt desc
            """)
    List<Task> findHistory(
            @Param("userId") Long userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("fromInstant") Instant fromInstant,
            @Param("toInstant") Instant toInstant
    );

    @Modifying
    @Query("delete from Task t where t.userId = :userId and t.done = true")
    int deleteCompletedByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("""
            delete from Task t
            where t.userId = :userId and t.done = true
              and (
                    (t.taskDate is not null and t.taskDate between :fromDate and :toDate)
                 or (t.taskDate is null and t.syncDate is not null and t.syncDate between :fromDate and :toDate)
                 or (t.taskDate is null and t.syncDate is null and t.createdAt >= :fromInstant and t.createdAt < :toInstant)
              )
            """)
    int deleteCompletedInRange(
            @Param("userId") Long userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("fromInstant") Instant fromInstant,
            @Param("toInstant") Instant toInstant
    );

    long countByUserId(Long userId);
}
