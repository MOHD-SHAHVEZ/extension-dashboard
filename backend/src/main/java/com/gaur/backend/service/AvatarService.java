package com.gaur.backend.service;

import com.gaur.backend.model.AppUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.util.Locale;

@Service
public class AvatarService {

    private final UserService userService;
    private final CloudinaryService cloudinaryService;
    private final long maxBytes;
    private final int maxChanges;

    public AvatarService(
            UserService userService,
            CloudinaryService cloudinaryService,
            @Value("${app.avatar.max-bytes:5242880}") long maxBytes,
            @Value("${app.avatar.max-changes-per-month:3}") int maxChanges
    ) {
        this.userService = userService;
        this.cloudinaryService = cloudinaryService;
        this.maxBytes = maxBytes;
        this.maxChanges = maxChanges;
    }

    @Transactional
    public AppUser upload(String username, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a photo first");
        }
        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo must be 5 MB or smaller");
        }
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!type.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed");
        }

        AppUser user = userService.requireByUsername(username);
        String month = YearMonth.now().toString();
        int used = usedThisMonth(user, month);
        if (used >= maxChanges) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "You can change your photo only " + maxChanges + " times this month. Try again next month."
            );
        }

        try {
            String url = cloudinaryService.uploadAvatar(user.getId(), file.getBytes());
            user.setAvatarDataUrl(url);
            user.setAvatarChangeMonth(month);
            user.setAvatarChangeCount(used + 1);
            return userService.save(user);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read this photo");
        }
    }

    public int maxChangesPerMonth() {
        return maxChanges;
    }

    public int remainingThisMonth(AppUser user) {
        return Math.max(0, maxChanges - usedThisMonth(user, YearMonth.now().toString()));
    }

    public int usedThisMonth(AppUser user) {
        return usedThisMonth(user, YearMonth.now().toString());
    }

    private static int usedThisMonth(AppUser user, String month) {
        if (month.equals(user.getAvatarChangeMonth())) {
            return user.getAvatarChangeCount();
        }
        return 0;
    }
}
