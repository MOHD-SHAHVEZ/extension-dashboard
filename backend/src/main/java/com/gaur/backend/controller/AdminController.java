package com.gaur.backend.controller;

import com.gaur.backend.model.Summary;
import com.gaur.backend.repository.SummaryRepository;
import com.gaur.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final SummaryRepository summaryRepo;
    private final UserRepository userRepo;

    public AdminController(SummaryRepository summaryRepo, UserRepository userRepo) {
        this.summaryRepo = summaryRepo;
        this.userRepo = userRepo;
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        long totalSummaries = summaryRepo.count();
        long totalUsers = userRepo.count();
        long todayCount = summaryRepo.countByCreatedAt(LocalDate.now().toString());
        return Map.of(
                "totalSummaries", totalSummaries,
                "totalUsers", totalUsers,
                "today", todayCount
        );
    }

    @GetMapping("/summaries")
    public List<Summary> recentSummaries(
            @RequestParam(name = "limit", required = false, defaultValue = "20") int limit
    ) {
        int size = Math.min(Math.max(limit, 1), 100);
        return summaryRepo.findAll(PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "id"))).getContent();
    }
}
