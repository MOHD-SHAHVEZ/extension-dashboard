package com.gaur.backend.model;
import jakarta.persistence.*;
import lombok.*;

@Entity @Data @NoArgsConstructor @AllArgsConstructor
@Table(name="app_user")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique=true, nullable=false) private String username;
    @Column(nullable=false) private String password; // store hashed
    @Column(nullable=false) private String role; // ROLE_USER or ROLE_ADMIN
}


