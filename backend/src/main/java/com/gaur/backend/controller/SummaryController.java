package com.gaur.backend.controller;

import lombok.RequiredArgsConstructor;
import com.gaur.backend.service.SummaryService;
import com.gaur.backend.model.Summary;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/summaries")
@RequiredArgsConstructor
public class SummaryController {
    private final SummaryService summaryService;

    // get all for current user (or all if admin)
    @GetMapping
    public List<Summary> listAll(HttpServletRequest req){
        var principal = req.getUserPrincipal();
        String username = principal != null ? principal.getName() : null;
        return summaryService.findByOwner(username);
    }

    // ✅ GET single summary by id (new)
    @GetMapping("/{id}")
    public Summary getById(@PathVariable Long id, HttpServletRequest req) {
        Summary exist = summaryService.findById(id);
        if (exist == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Summary not found");
        }

        // allow if owner
        var principal = req.getUserPrincipal();
        String username = principal != null ? principal.getName() : null;

        // If request is unauthenticated -> 401
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Full authentication is required to access this resource");
        }

        // allow if owner OR user has ADMIN role
        boolean isOwner = username.equals(exist.getOwner());
        boolean isAdmin = req.isUserInRole("ADMIN");

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        return exist;
    }

    @PostMapping
    public Summary create(@RequestBody Summary input, HttpServletRequest req){
        var principal = req.getUserPrincipal();
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        String username = principal.getName();
        input.setOwner(username);
        input.setCreatedAt(LocalDate.now().toString());
        return summaryService.save(input);
    }

    @PutMapping("/{id}")
    public Summary update(@PathVariable Long id, @RequestBody Summary input, HttpServletRequest req){
        Summary exist = summaryService.findById(id);
        if (exist == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");

        var principal = req.getUserPrincipal();
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        String username = principal.getName();

        if (!exist.getOwner().equals(username) && !req.isUserInRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        exist.setTitle(input.getTitle() != null ? input.getTitle() : exist.getTitle());
        exist.setExcerpt(input.getExcerpt() != null ? input.getExcerpt() : exist.getExcerpt());
        exist.setContent(input.getContent() != null ? input.getContent() : exist.getContent());
        exist.setPinned(input.isPinned());
        exist.setSourceUrl(input.getSourceUrl());
        return summaryService.save(exist);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id, HttpServletRequest req){
        Summary exist = summaryService.findById(id);
        if (exist == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");

        var principal = req.getUserPrincipal();
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        String username = principal.getName();

        if (!exist.getOwner().equals(username) && !req.isUserInRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        summaryService.delete(id);
        return "deleted";
    }
}
