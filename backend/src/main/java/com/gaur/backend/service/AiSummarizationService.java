package com.gaur.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gaur.backend.model.Summary;
import com.gaur.backend.repository.SummaryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AiSummarizationService {

    private static final Logger log = LoggerFactory.getLogger(AiSummarizationService.class);

    private final SummaryRepository summaryRepository;
    private final ContentExtractorService extractor;
    private final ObjectMapper objectMapper;
    private final CacheManager cacheManager;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.ai.api-key:}")
    private String groqApiKey;

    @Value("${app.ai.model:openai/gpt-oss-20b}")
    private String groqModel;

    @Value("${app.ai.base-url:https://api.groq.com/openai/v1}")
    private String groqBaseUrl;

    public AiSummarizationService(
            SummaryRepository summaryRepository,
            ContentExtractorService extractor,
            ObjectMapper objectMapper,
            CacheManager cacheManager
    ) {
        this.summaryRepository = summaryRepository;
        this.extractor = extractor;
        this.objectMapper = objectMapper;
        this.cacheManager = cacheManager;
    }

    @Async("summarizationExecutor")
    public void process(Long summaryId) {
        Summary summary = summaryRepository.findById(summaryId).orElse(null);
        if (summary == null) return;
        try {
            ContentExtractorService.ExtractedPage page = extractor.extract(summary.getSourceUrl());
            String[] generated = generateSummary(page.title(), page.text());
            summary.setTitle(trim(generated[0] != null ? generated[0] : page.title(), 250));
            summary.setExcerpt(trim(generated[1], 2000));
            summary.setContent(generated[2]);
            if (summary.getTags() == null || summary.getTags().isEmpty()) {
                summary.setTags(page.tags());
            }
            summary.setStatus(Summary.STATUS_READY);
            summary.setErrorMessage(null);
            summaryRepository.save(summary);
        } catch (Exception ex) {
            log.warn("AI summarization failed for id={}: {}", summaryId, ex.getMessage());
            summary.setStatus(Summary.STATUS_FAILED);
            summary.setErrorMessage(trim(ex.getMessage(), 1000));
            if (summary.getTitle() == null || summary.getTitle().isBlank()) {
                summary.setTitle("Failed summary");
            }
            if (summary.getExcerpt() == null) {
                summary.setExcerpt("Could not summarize this URL. You can retry or paste the content manually.");
            }
            summaryRepository.save(summary);
        } finally {
            evictCaches(summary.getOwner());
        }
    }

    private String[] generateSummary(String title, String text) {
        if (groqApiKey != null && !groqApiKey.isBlank()) {
            try {
                return groqSummary(title, text);
            } catch (Exception ex) {
                log.warn("Groq summarization fallback: {}", ex.getMessage());
            }
        }
        return extractiveSummary(title, text);
    }

    private String[] groqSummary(String title, String text) throws Exception {
        String prompt = "Summarize the following page for a productivity dashboard. "
                + "Return JSON with keys title, excerpt (max 400 chars), content (markdown with 5-8 bullet takeaways). "
                + "Page title: " + title + "\n\n" + trim(text, 12000);

        Map<String, Object> body = Map.of(
                "model", groqModel,
                "temperature", 0.2,
                "messages", List.of(
                        Map.of("role", "system", "content", "You write concise technical summaries. Reply with JSON only."),
                        Map.of("role", "user", "content", prompt)
                )
        );

        String endpoint = groqBaseUrl.endsWith("/")
                ? groqBaseUrl + "chat/completions"
                : groqBaseUrl + "/chat/completions";
        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(45))
                .header("Authorization", "Bearer " + groqApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("Groq HTTP " + response.statusCode() + " " + trim(response.body(), 240));
        }
        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").path(0).path("message").path("content").asText("");
        JsonNode parsed = tryParseJson(content);
        if (parsed != null) {
            return new String[] {
                    parsed.path("title").asText(title),
                    parsed.path("excerpt").asText(""),
                    parsed.path("content").asText("")
            };
        }
        return new String[] { title, trim(content, 400), content };
    }

    private JsonNode tryParseJson(String content) {
        try {
            String trimmed = content.trim();
            if (trimmed.startsWith("```")) {
                trimmed = trimmed.replaceAll("^```(?:json)?", "").replaceAll("```$", "").trim();
            }
            return objectMapper.readTree(trimmed);
        } catch (Exception e) {
            return null;
        }
    }

    private static String[] extractiveSummary(String title, String text) {
        String cleaned = text == null ? "" : text.replaceAll("\\s+", " ").trim();
        List<String> sentences = Arrays.stream(cleaned.split("(?<=[.!?])\\s+"))
                .map(String::trim)
                .filter(s -> s.length() > 40)
                .limit(8)
                .toList();
        String excerpt = sentences.isEmpty() ? trim(cleaned, 400) : trim(String.join(" ", sentences.subList(0, Math.min(2, sentences.size()))), 400);
        StringBuilder md = new StringBuilder();
        md.append("# ").append(title).append("\n\n");
        md.append("Key takeaways:\n\n");
        if (sentences.isEmpty()) {
            md.append("- ").append(trim(cleaned, 800)).append('\n');
        } else {
            for (String sentence : sentences) {
                md.append("- ").append(sentence).append('\n');
            }
        }
        return new String[] { title, excerpt, md.toString() };
    }

    private void evictCaches(String owner) {
        if (cacheManager.getCache("summaries") != null) cacheManager.getCache("summaries").evict(owner);
        if (cacheManager.getCache("dashboard") != null) cacheManager.getCache("dashboard").evict(owner);
    }

    private static String trim(String value, int max) {
        if (value == null) return "";
        String v = value.trim();
        if (v.length() <= max) return v;
        return v.substring(0, max - 1) + "…";
    }
}
