package com.gaur.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity @Data @NoArgsConstructor @AllArgsConstructor
public class Summary {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    @Column(length=2000) private String excerpt;
    @Column(length=10000) private String content;
    private String sourceUrl;
    private String createdAt; // simple string date for now
    private boolean pinned;
    private String owner; // username
}

