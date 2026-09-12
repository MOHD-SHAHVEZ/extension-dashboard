package com.gaur.backend.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ContentExtractorService {

    public record ExtractedPage(String title, String text, List<String> tags) {}

    private static final Pattern YT = Pattern.compile(
            "(?:youtube\\.com/watch\\?v=|youtu\\.be/)([A-Za-z0-9_-]{6,})",
            Pattern.CASE_INSENSITIVE
    );

    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public ExtractedPage extract(String sourceUrl) {
        String url = sourceUrl.trim();
        if (isYoutube(url)) {
            return extractYoutube(url);
        }
        return extractHtml(url);
    }

    private ExtractedPage extractHtml(String url) {
        String html = fetch(url);
        Document doc = Jsoup.parse(html, url);
        doc.select("script, style, noscript, nav, footer, iframe").remove();
        String title = firstNonBlank(
                attr(doc, "meta[property=og:title]", "content"),
                attr(doc, "meta[name=twitter:title]", "content"),
                doc.title()
        );
        if (title == null || title.isBlank()) title = hostTitle(url);
        String description = firstNonBlank(
                attr(doc, "meta[name=description]", "content"),
                attr(doc, "meta[property=og:description]", "content"),
                ""
        );
        String body = doc.body() != null ? doc.body().text() : "";
        String text = (description + "\n\n" + body).trim();
        if (text.length() > 20_000) text = text.substring(0, 20_000);
        return new ExtractedPage(title.trim(), text, inferTags(title + " " + description));
    }

    private ExtractedPage extractYoutube(String url) {
        String oembedUrl = "https://www.youtube.com/oembed?format=json&url=" + java.net.URLEncoder.encode(url, java.nio.charset.StandardCharsets.UTF_8);
        String json = fetch(oembedUrl);
        String title = extractJsonString(json, "title");
        String author = extractJsonString(json, "author_name");
        if (title == null || title.isBlank()) title = "YouTube video";
        String text = "YouTube video: " + title
                + (author != null ? " by " + author : "")
                + ". Full transcript extraction is not enabled; summary is based on the public video metadata.";
        List<String> tags = new ArrayList<>();
        tags.add("YouTube");
        tags.addAll(inferTags(title));
        return new ExtractedPage(title, text, tags);
    }

    private String fetch(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "Mozilla/5.0 (compatible; NexusSummarizer/1.0)")
                    .header("Accept", "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8")
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new IllegalStateException("Failed to fetch URL (HTTP " + response.statusCode() + ")");
            }
            return response.body() != null ? response.body() : "";
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch URL: " + e.getMessage());
        }
    }

    private static boolean isYoutube(String url) {
        String u = url.toLowerCase(Locale.ROOT);
        return u.contains("youtube.com") || u.contains("youtu.be") || YT.matcher(url).find();
    }

    private static String attr(Document doc, String css, String attr) {
        var el = doc.selectFirst(css);
        return el != null ? el.attr(attr) : null;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private static String hostTitle(String url) {
        try {
            return URI.create(url).getHost();
        } catch (Exception e) {
            return "Untitled page";
        }
    }

    private static String extractJsonString(String json, String key) {
        Matcher m = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"").matcher(json);
        if (!m.find()) return null;
        return m.group(1).replace("\\\"", "\"");
    }

    static List<String> inferTags(String haystack) {
        String h = haystack == null ? "" : haystack.toLowerCase(Locale.ROOT);
        List<String> tags = new ArrayList<>();
        if (h.contains("system design") || h.contains("distributed") || h.contains("architecture")) tags.add("System Design");
        if (h.contains("ai") || h.contains("llm") || h.contains("transformer") || h.contains("machine learning")) tags.add("AI Research");
        if (h.contains("chrome") || h.contains("extension") || h.contains("javascript") || h.contains("react")) tags.add("Chrome Dev");
        if (h.contains("interview")) tags.add("Interview Prep");
        if (tags.isEmpty()) tags.add("Web");
        return tags;
    }
}
