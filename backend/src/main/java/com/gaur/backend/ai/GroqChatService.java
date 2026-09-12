package com.gaur.backend.ai;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GroqChatService {

    private static final Logger log = LoggerFactory.getLogger(GroqChatService.class);

    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final String apiKey;
    private final String model;
    private final String baseUrl;

    public GroqChatService(
            ObjectMapper objectMapper,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:openai/gpt-oss-20b}") String model,
            @Value("${app.ai.base-url:https://api.groq.com/openai/v1}") String baseUrl
    ) {
        this.mapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    public String modelName() {
        return model;
    }

    public <T> T completeJson(String systemPrompt, String userPrompt, Class<T> type) {
        if (!SpringAiLessonSummarizer.hasRealApiKey(apiKey)) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "GROQ_API_KEY is not set. Add it to the environment and restart the backend."
            );
        }
        try {
            String raw = complete(systemPrompt, userPrompt);
            String json = extractJson(raw);
            T parsed = mapper.readValue(json, type);
            if (parsed == null) {
                throw new IllegalStateException("Groq returned empty JSON");
            }
            return parsed;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Groq JSON chat failed: {}", ex.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    SpringAiLessonSummarizer.friendlyFailure("Groq could not complete this request.", ex)
            );
        }
    }

    private String complete(String systemPrompt, String userPrompt) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("temperature", 0.3);
        body.put("max_tokens", 4096);
        body.put("reasoning_effort", "low");
        body.put("reasoning_format", "hidden");
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));

        String endpoint = baseUrl.endsWith("/")
                ? baseUrl + "chat/completions"
                : baseUrl + "/chat/completions";
        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(90))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400 && (response.body() != null && (
                response.body().contains("reasoning_effort") || response.body().contains("reasoning_format")
        ))) {
            body.remove("reasoning_effort");
            body.remove("reasoning_format");
            request = HttpRequest.newBuilder(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(90))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        }
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("HTTP " + response.statusCode() + " - " + trim(response.body(), 400));
        }
        String text = readMessageText(mapper.readTree(response.body()));
        if (text.isBlank()) {
            throw new IllegalStateException("Groq returned an empty reply");
        }
        return text;
    }

    private static String readMessageText(JsonNode root) {
        JsonNode message = root.path("choices").path(0).path("message");
        String content = asText(message.get("content"));
        if (!content.isBlank()) return content;
        String reasoning = asText(message.get("reasoning"));
        if (!reasoning.isBlank()) return reasoning;
        JsonNode parts = message.get("content");
        if (parts != null && parts.isArray()) {
            StringBuilder joined = new StringBuilder();
            for (JsonNode part : parts) {
                String piece = asText(part.get("text"));
                if (piece.isBlank()) piece = asText(part);
                if (!piece.isBlank()) {
                    if (!joined.isEmpty()) joined.append('\n');
                    joined.append(piece);
                }
            }
            return joined.toString();
        }
        return "";
    }

    private static String asText(JsonNode node) {
        if (node == null || node.isNull()) return "";
        if (node.isTextual()) return node.asText("").trim();
        return "";
    }

    static String extractJson(String raw) {
        String text = raw == null ? "" : raw.trim();
        if (text.startsWith("```")) {
            text = text.replaceAll("^```(?:json)?", "").replaceAll("```\\s*$", "").trim();
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        throw new IllegalStateException("Groq reply was not JSON");
    }

    private static String trim(String value, int max) {
        if (value == null) return "";
        String v = value.trim();
        return v.length() <= max ? v : v.substring(0, max) + "…";
    }
}
