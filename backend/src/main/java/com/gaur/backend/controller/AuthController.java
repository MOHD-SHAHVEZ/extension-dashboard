package com.gaur.backend.controller;

import com.gaur.backend.dto.AuthRequest;
import com.gaur.backend.dto.AuthResponse;
import com.gaur.backend.model.AppUser;
import com.gaur.backend.service.JwtService;
import com.gaur.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final PasswordEncoder encoder;

    /**
     * Login endpoint.
     * Returns 200 + AuthResponse on success.
     * Returns 401 + {error: "..."} on invalid username/password.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        if (req == null || req.getUsername() == null || req.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "username and password required"));
        }

        Optional<AppUser> maybe = userService.findByUsername(req.getUsername());
        if (maybe.isEmpty()) {
            // Do not reveal whether username exists for security, just generic message
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }

        AppUser user = maybe.get();
        boolean matches = encoder.matches(req.getPassword(), user.getPassword());
        if (!matches) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }

        String token = jwtService.createToken(user.getUsername(), user.getRole());
        AuthResponse resp = new AuthResponse(token, user.getUsername(), user.getRole());
        return ResponseEntity.ok(resp);
    }

    /**
     * Register a new (normal) user.
     * Returns 201 on success, 409 if username exists.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        if (req == null || req.getUsername() == null || req.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "username and password required"));
        }

        if (userService.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Username already exists"));
        }

        AppUser u = new AppUser(null, req.getUsername(), encoder.encode(req.getPassword()), "ROLE_USER");
        userService.save(u);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "User registered successfully"));
    }

    /**
     * Create default admin and user accounts if they do not exist.
     * Safe to call multiple times (idempotent).
     */
    @PostMapping("/register-defaults")
    public ResponseEntity<?> registerDefaults() {
        if (userService.findByUsername("admin").isEmpty()) {
            userService.save(new AppUser(null, "admin", encoder.encode("admin"), "ROLE_ADMIN"));
        }
        if (userService.findByUsername("user").isEmpty()) {
            userService.save(new AppUser(null, "user", encoder.encode("user"), "ROLE_USER"));
        }
        return ResponseEntity.ok(Map.of("message", "defaults registered (if absent)"));
    }
}
