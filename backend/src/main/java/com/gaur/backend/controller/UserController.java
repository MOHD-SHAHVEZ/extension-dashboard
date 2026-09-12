package com.gaur.backend.controller;

import com.gaur.backend.dto.ProfileUpdateRequest;
import com.gaur.backend.model.AppUser;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.AvatarService;
import com.gaur.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final AvatarService avatarService;

    public UserController(UserService userService, AvatarService avatarService) {
        this.userService = userService;
        this.avatarService = avatarService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe() {
        AppUser user = userService.requireByUsername(SecurityUtils.currentUsername());
        return ResponseEntity.ok(toProfilePayload(user, null));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file) {
        AppUser user = avatarService.upload(SecurityUtils.currentUsername(), file);
        return ResponseEntity.ok(toProfilePayload(user, "Profile photo updated"));
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody ProfileUpdateRequest req) {
        AppUser user = userService.requireByUsername(SecurityUtils.currentUsername());

        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getPersona() != null) user.setPersona(req.getPersona());
        if (Boolean.TRUE.equals(req.getAcceptedTerms())) {
            user.setTermsAcceptedAt(LocalDateTime.now());
            user.setTermsVersion("1.0");
        }
        // Avatar uploads go through POST /me/avatar (Cloudinary + monthly limit).
        if (req.getDarkMode() != null) user.setDarkMode(req.getDarkMode());
        if (req.getEmailNotifications() != null) user.setEmailNotifications(req.getEmailNotifications());
        if (req.getBio() != null) user.setBio(req.getBio().trim());
        if (req.getGithubUrl() != null) user.setGithubUrl(req.getGithubUrl().trim());
        if (req.getLinkedinUrl() != null) user.setLinkedinUrl(req.getLinkedinUrl().trim());
        if (req.getPortfolioUrl() != null) user.setPortfolioUrl(req.getPortfolioUrl().trim());

        if (req.getFirstName() != null) user.setFirstName(req.getFirstName().trim());
        if (req.getLastName() != null) user.setLastName(req.getLastName().trim());
        if (req.getName() != null && !req.getName().isBlank()) {
            applyFullName(user, req.getName().trim());
        }

        userService.save(user);
        return ResponseEntity.ok(toProfilePayload(user, "Profile updated successfully"));
    }

    private Map<String, Object> toProfilePayload(AppUser user, String message) {
        boolean isComplete = user.getFirstName() != null && !user.getFirstName().isBlank()
                && user.getPhone() != null && !user.getPhone().isBlank()
                && user.getPersona() != null && !user.getPersona().isBlank();
        int used = avatarService.usedThisMonth(user);
        int left = avatarService.remainingThisMonth(user);
        int max = avatarService.maxChangesPerMonth();

        Map<String, Object> safeUser = new LinkedHashMap<>();
        safeUser.put("id", user.getId());
        safeUser.put("username", user.getUsername());
        safeUser.put("role", user.getRole());
        safeUser.put("firstName", user.getFirstName());
        safeUser.put("lastName", user.getLastName());
        safeUser.put("name", user.getName());
        safeUser.put("phone", user.getPhone());
        safeUser.put("persona", user.getPersona());
        safeUser.put("avatarDataUrl", user.getAvatarDataUrl());
        safeUser.put("darkMode", user.isDarkMode());
        safeUser.put("emailNotifications", user.isEmailNotifications());
        safeUser.put("bio", user.getBio());
        safeUser.put("githubUrl", user.getGithubUrl());
        safeUser.put("linkedinUrl", user.getLinkedinUrl());
        safeUser.put("portfolioUrl", user.getPortfolioUrl());
        safeUser.put("termsAcceptedAt", user.getTermsAcceptedAt());
        safeUser.put("termsVersion", user.getTermsVersion());
        safeUser.put("createdAt", user.getCreatedAt());
        safeUser.put("avatarChangesUsed", used);
        safeUser.put("avatarChangesLeft", left);
        safeUser.put("avatarChangesMax", max);

        Map<String, Object> body = new LinkedHashMap<>();
        if (message != null) body.put("message", message);
        body.put("user", safeUser);
        body.put("profileCompleteness", Map.of("isComplete", isComplete));
        body.put("username", user.getUsername());
        body.put("name", user.getName());
        body.put("avatarDataUrl", user.getAvatarDataUrl() != null ? user.getAvatarDataUrl() : "");
        body.put("darkMode", user.isDarkMode());
        body.put("emailNotifications", user.isEmailNotifications());
        body.put("bio", user.getBio());
        body.put("githubUrl", user.getGithubUrl());
        body.put("linkedinUrl", user.getLinkedinUrl());
        body.put("portfolioUrl", user.getPortfolioUrl());
        body.put("phone", user.getPhone());
        body.put("persona", user.getPersona());
        body.put("firstName", user.getFirstName());
        body.put("lastName", user.getLastName());
        body.put("avatarChangesUsed", used);
        body.put("avatarChangesLeft", left);
        body.put("avatarChangesMax", max);
        return body;
    }

    private static void applyFullName(AppUser user, String name) {
        String[] parts = name.split("\\s+", 2);
        user.setFirstName(parts[0]);
        user.setLastName(parts.length > 1 ? parts[1] : "");
    }
}
