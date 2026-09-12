package com.gaur.backend.service;

import com.gaur.backend.dto.LessonFileImportResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

@Service
public class LessonFileImportService {

    private static final long MAX_BYTES = 10 * 1024 * 1024;
    private static final int MAX_CHARS = 200_000;
    private static final Set<String> TEXT_EXT = Set.of("md", "markdown", "txt", "text");

    private final LessonNoteService lessonNoteService;

    public LessonFileImportService(LessonNoteService lessonNoteService) {
        this.lessonNoteService = lessonNoteService;
    }

    public LessonFileImportResponse extract(Long lessonId, String owner, MultipartFile file) {
        lessonNoteService.requireOwnedLesson(lessonId, owner);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a .md, .txt, or .pdf file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be 10 MB or smaller");
        }

        String original = file.getOriginalFilename() == null ? "notes" : file.getOriginalFilename().trim();
        String ext = extension(original);
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        boolean pdf = "pdf".equals(ext) || type.contains("pdf");
        boolean text = TEXT_EXT.contains(ext) || type.startsWith("text/") || type.contains("markdown");
        if (!pdf && !text) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only Markdown, text, or PDF files are allowed");
        }

        String extracted = pdf ? extractPdf(file) : extractText(file);
        extracted = clean(extracted);
        if (extracted.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No readable text found in this file");
        }
        if (extracted.length() > MAX_CHARS) {
            extracted = extracted.substring(0, MAX_CHARS) + "\n\n[Truncated — file was too long]";
        }

        return new LessonFileImportResponse(
                original,
                pdf ? "pdf" : (ext.equals("md") || ext.equals("markdown") ? "markdown" : "text"),
                suggestTitle(original, extracted),
                extracted
        );
    }

    private static String extractText(MultipartFile file) {
        try {
            String raw = new String(file.getBytes(), StandardCharsets.UTF_8);
            if (raw.startsWith("\uFEFF")) raw = raw.substring(1);
            return raw;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read this text file");
        }
    }

    private static String extractPdf(MultipartFile file) {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            if (document.isEncrypted()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This PDF is password-protected");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read text from this PDF");
        }
    }

    private static String clean(String value) {
        if (value == null) return "";
        return value.replace("\r\n", "\n").replace('\r', '\n').replace("\u0000", "").trim();
    }

    private static String extension(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return "";
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static String suggestTitle(String fileName, String text) {
        for (String raw : text.split("\n")) {
            String line = raw.trim();
            if (line.isEmpty()) continue;
            if (line.startsWith("#")) {
                return line.replaceFirst("^#+\\s*", "").replaceAll("[*_`]", "").trim();
            }
            if (line.length() > 3 && line.length() < 120 && !line.startsWith("|")) {
                return line;
            }
            break;
        }
        int dot = fileName.lastIndexOf('.');
        String base = dot > 0 ? fileName.substring(0, dot) : fileName;
        return base.replace('_', ' ').replace('-', ' ').trim();
    }
}
