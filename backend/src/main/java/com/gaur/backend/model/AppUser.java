package com.gaur.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "app_user")
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "phone")
    private String phone;

    @Column(name = "persona", length = 32)
    private String persona;

    @Column(name = "terms_accepted_at")
    private java.time.LocalDateTime termsAcceptedAt;

    @Column(name = "terms_version", length = 32)
    private String termsVersion;

    @Column(name = "avatar_data_url", columnDefinition = "TEXT")
    private String avatarDataUrl;

    @Column(name = "dark_mode")
    private Boolean darkMode = Boolean.FALSE;

    @Column(name = "email_notifications")
    private Boolean emailNotifications = Boolean.TRUE;

    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "github_url", length = 255)
    private String githubUrl;

    @Column(name = "linkedin_url", length = 255)
    private String linkedinUrl;

    @Column(name = "portfolio_url", length = 255)
    private String portfolioUrl;

    @Column(name = "avatar_change_month", length = 7)
    private String avatarChangeMonth;

    @Column(name = "avatar_change_count")
    private Integer avatarChangeCount = 0;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (darkMode == null) darkMode = Boolean.FALSE;
        if (emailNotifications == null) emailNotifications = Boolean.TRUE;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    @JsonProperty("name")
    public String getName() {
        String first = firstName != null ? firstName.trim() : "";
        String last = lastName != null ? lastName.trim() : "";
        String combined = (first + " " + last).trim();
        return combined.isEmpty() ? username : combined;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPersona() { return persona; }
    public void setPersona(String persona) { this.persona = persona; }
    public java.time.LocalDateTime getTermsAcceptedAt() { return termsAcceptedAt; }
    public void setTermsAcceptedAt(java.time.LocalDateTime termsAcceptedAt) { this.termsAcceptedAt = termsAcceptedAt; }
    public String getTermsVersion() { return termsVersion; }
    public void setTermsVersion(String termsVersion) { this.termsVersion = termsVersion; }
    public String getAvatarDataUrl() { return avatarDataUrl; }
    public void setAvatarDataUrl(String avatarDataUrl) { this.avatarDataUrl = avatarDataUrl; }
    public boolean isDarkMode() { return Boolean.TRUE.equals(darkMode); }
    public void setDarkMode(Boolean darkMode) { this.darkMode = darkMode; }
    public boolean isEmailNotifications() { return emailNotifications == null || Boolean.TRUE.equals(emailNotifications); }
    public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }
    public String getLinkedinUrl() { return linkedinUrl; }
    public void setLinkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; }
    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }
    public String getAvatarChangeMonth() { return avatarChangeMonth; }
    public void setAvatarChangeMonth(String avatarChangeMonth) { this.avatarChangeMonth = avatarChangeMonth; }
    public Integer getAvatarChangeCount() { return avatarChangeCount == null ? 0 : avatarChangeCount; }
    public void setAvatarChangeCount(Integer avatarChangeCount) { this.avatarChangeCount = avatarChangeCount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
