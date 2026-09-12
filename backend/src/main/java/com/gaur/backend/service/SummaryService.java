package com.gaur.backend.service;

import com.gaur.backend.model.AppUser;
import com.gaur.backend.model.Summary;
import com.gaur.backend.repository.LessonAiSummaryRepository;
import com.gaur.backend.repository.SummaryRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
public class SummaryService {
    private final SummaryRepository repo;
    private final UserService userService;
    private final AiSummarizationService aiSummarizationService;
    private final LessonAiSummaryRepository lessonAiSummaryRepo;

    public SummaryService(
            SummaryRepository repo,
            UserService userService,
            AiSummarizationService aiSummarizationService,
            LessonAiSummaryRepository lessonAiSummaryRepo
    ) {
        this.repo = repo;
        this.userService = userService;
        this.aiSummarizationService = aiSummarizationService;
        this.lessonAiSummaryRepo = lessonAiSummaryRepo;
    }

    @Cacheable(value = "summaries", key = "#owner")
    public List<Summary> findByOwner(String owner) {
        return repo.findByOwnerOrderByIdDesc(owner);
    }

    public List<Summary> findByOwner(String owner, int page, int limit) {
        int p = Math.max(page, 1) - 1;
        int size = Math.min(Math.max(limit, 1), 100);
        return repo.findByOwnerOrderByIdDesc(owner, PageRequest.of(p, size)).getContent();
    }

    public List<Summary> findAll() {
        return repo.findAll();
    }

    public Summary save(Summary s) {
        return repo.save(s);
    }

    public void delete(Long id) {
        repo.deleteById(id);
    }

    public Summary findById(Long id) {
        return repo.findById(id).orElse(null);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "summaries", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public Summary createManual(String username, Summary input) {
        AppUser user = userService.requireByUsername(username);
        input.setId(null);
        input.setOwner(username);
        input.setUserId(user.getId());
        input.setCreatedAt(LocalDate.now().toString());
        if (input.getStatus() == null) input.setStatus(Summary.STATUS_READY);
        if (input.getTitle() == null || input.getTitle().isBlank()) {
            input.setTitle(guessTitle(input.getSourceUrl()));
        }
        return repo.save(input);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "summaries", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public Summary enqueueFromUrl(String username, String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceUrl is required");
        }
        String url = sourceUrl.trim();
        AppUser user = userService.requireByUsername(username);
        Summary summary = new Summary();
        summary.setOwner(username);
        summary.setUserId(user.getId());
        summary.setSourceUrl(url);
        summary.setTitle("Summarizing " + hostLabel(url) + "…");
        summary.setExcerpt("AI is extracting and summarizing this page. Refresh in a moment.");
        summary.setContent("");
        summary.setStatus(Summary.STATUS_PROCESSING);
        summary.setCreatedAt(LocalDate.now().toString());
        Summary saved = repo.save(summary);
        aiSummarizationService.process(saved.getId());
        return saved;
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "summaries", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public Summary updateOwned(String username, Summary exist, Summary input) {
        exist.setTitle(input.getTitle() != null ? input.getTitle() : exist.getTitle());
        exist.setExcerpt(input.getExcerpt() != null ? input.getExcerpt() : exist.getExcerpt());
        exist.setContent(input.getContent() != null ? input.getContent() : exist.getContent());
        if (input.getPinned() != null) exist.setPinned(input.getPinned());
        if (input.getSourceUrl() != null) exist.setSourceUrl(input.getSourceUrl());
        if (input.getTags() != null) exist.setTags(input.getTags());
        return repo.save(exist);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "summaries", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public void deleteOwned(String username, Long id) {
        Summary exist = repo.findById(id).orElse(null);
        Long lessonAiId = exist == null ? null : parseLessonAiId(exist.getSourceUrl());
        if (lessonAiId != null) {
            lessonAiSummaryRepo.findByIdAndOwner(lessonAiId, username).ifPresent(lessonAiSummaryRepo::delete);
        }
        repo.deleteById(id);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "summaries", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public void publishLessonAiSummary(String username, com.gaur.backend.model.LessonAiSummary lessonSummary) {
        String source = lessonSourceUrl(lessonSummary.getId());
        AppUser user = userService.requireByUsername(username);
        Summary row = repo.findByOwnerAndSourceUrl(username, source).orElseGet(Summary::new);
        if (row.getId() == null) {
            row.setOwner(username);
            row.setUserId(user.getId());
            row.setCreatedAt(LocalDate.now().toString());
            row.setPinned(Boolean.FALSE);
        }
        row.setTitle(lessonSummary.getTitle());
        row.setExcerpt(lessonSummary.getExcerpt());
        row.setContent(lessonSummary.getContent());
        row.setSourceUrl(source);
        row.setStatus(Summary.STATUS_READY);
        row.setErrorMessage(null);
        row.setSubjectName(lessonSummary.getSubjectName());
        row.setLessonTitle(lessonSummary.getLessonTitle());
        row.setNotebookId(lessonSummary.getNotebookId());
        row.setLessonId(lessonSummary.getLessonId());
        row.setTags(List.of(
                lessonSummary.getSubjectName() == null || lessonSummary.getSubjectName().isBlank()
                        ? "Lesson" : lessonSummary.getSubjectName(),
                lessonSummary.getLessonTitle() == null || lessonSummary.getLessonTitle().isBlank()
                        ? "Notebook" : lessonSummary.getLessonTitle()
        ));
        repo.save(row);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "summaries", key = "#username"),
            @CacheEvict(value = "dashboard", key = "#username")
    })
    public void unpublishLessonAiSummary(String username, Long lessonAiSummaryId) {
        repo.deleteByOwnerAndSourceUrl(username, lessonSourceUrl(lessonAiSummaryId));
    }

    public static String lessonSourceUrl(Long lessonAiSummaryId) {
        return "lesson-ai:" + lessonAiSummaryId;
    }

    private static Long parseLessonAiId(String sourceUrl) {
        if (sourceUrl == null || !sourceUrl.startsWith("lesson-ai:")) return null;
        try {
            return Long.parseLong(sourceUrl.substring("lesson-ai:".length()).trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String guessTitle(String url) {
        if (url == null || url.isBlank()) return "Untitled summary";
        return "Summary: " + hostLabel(url);
    }

    private static String hostLabel(String url) {
        try {
            String host = java.net.URI.create(url).getHost();
            if (host == null) return url.substring(0, Math.min(48, url.length()));
            return host.toLowerCase(Locale.ROOT);
        } catch (Exception e) {
            return url.substring(0, Math.min(48, url.length()));
        }
    }
}
