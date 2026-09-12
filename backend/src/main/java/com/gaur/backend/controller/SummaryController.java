package com.gaur.backend.controller;

import com.gaur.backend.dto.SummarizeUrlRequest;
import com.gaur.backend.model.Summary;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.SummaryService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/api/summaries")
public class SummaryController {
    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @GetMapping
    public List<Summary> listAll(
            @RequestParam(name = "page", required = false, defaultValue = "1") int page,
            @RequestParam(name = "limit", required = false, defaultValue = "50") int limit
    ) {
        String username = SecurityUtils.currentUsername();
        return summaryService.findByOwner(username, page, limit);
    }

    @GetMapping("/{id}")
    public Summary getById(@PathVariable Long id, HttpServletRequest req) {
        Summary exist = summaryService.findById(id);
        if (exist == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Summary not found");
        }
        String username = SecurityUtils.currentUsername();
        boolean isOwner = username.equals(exist.getOwner());
        boolean isAdmin = req.isUserInRole("ADMIN");
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return exist;
    }

    @PostMapping
    public Summary create(@RequestBody Summary input) {
        return summaryService.createManual(SecurityUtils.currentUsername(), input);
    }

    @PostMapping("/from-url")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Summary summarizeFromUrl(@RequestBody SummarizeUrlRequest req) {
        return summaryService.enqueueFromUrl(SecurityUtils.currentUsername(), req.getSourceUrl());
    }

    @PutMapping("/{id}")
    public Summary update(@PathVariable Long id, @RequestBody Summary input, HttpServletRequest req) {
        Summary exist = summaryService.findById(id);
        if (exist == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        String username = SecurityUtils.currentUsername();
        if (!exist.getOwner().equals(username) && !req.isUserInRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return summaryService.updateOwned(username, exist, input);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id, HttpServletRequest req) {
        Summary exist = summaryService.findById(id);
        if (exist == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        String username = SecurityUtils.currentUsername();
        if (!exist.getOwner().equals(username) && !req.isUserInRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        summaryService.deleteOwned(username, id);
        return "deleted";
    }
}
