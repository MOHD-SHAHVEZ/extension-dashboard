package com.gaur.backend.controller;

import com.gaur.backend.repository.SummaryRepository;
import com.gaur.backend.repository.UserRepository;
import com.gaur.backend.model.Summary;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final SummaryRepository summaryRepo;
    private final UserRepository userRepo;

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        long totalSummaries = summaryRepo.count();
        long totalUsers = userRepo.count();

        LocalDate today = LocalDate.now();
        List<Summary> all = summaryRepo.findAll();
        long todayCount = all.stream()
                .filter(s -> today.toString().equals(s.getCreatedAt()))
                .count();

        return Map.of(
                "totalSummaries", totalSummaries,
                "totalUsers", totalUsers,
                "today", todayCount
        );
    }
}
