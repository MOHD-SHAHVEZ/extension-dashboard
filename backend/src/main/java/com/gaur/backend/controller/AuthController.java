package com.gaur.backend.controller;

import com.gaur.backend.dto.AuthRequest;
import com.gaur.backend.dto.AuthResponse;
import com.gaur.backend.dto.ChangePasswordRequest;
import com.gaur.backend.dto.RegisterRequest;
import com.gaur.backend.dto.VerifyOtpRequest;
import com.gaur.backend.model.AppUser;
import com.gaur.backend.security.SecurityUtils;
import com.gaur.backend.service.EmailService;
import com.gaur.backend.service.JwtService;
import com.gaur.backend.service.OtpService;
import com.gaur.backend.service.OtpService.IssuedOtp;
import com.gaur.backend.service.OtpService.VerifyOutcome;
import com.gaur.backend.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String PURPOSE_SIGNUP = "signup";

    private final UserService userService;
    private final JwtService jwtService;
    private final PasswordEncoder encoder;
    private final OtpService otpService;
    private final EmailService emailService;

    @Value("${app.security.allow-default-users:false}")
    private boolean allowDefaultUsers;

    public AuthController(
            UserService userService,
            JwtService jwtService,
            PasswordEncoder encoder,
            OtpService otpService,
            EmailService emailService
    ) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.encoder = encoder;
        this.otpService = otpService;
        this.emailService = emailService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        if (req == null || req.getEmail() == null || req.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "email and password required"));
        }

        Optional<AppUser> maybe = userService.findByUsername(req.getEmail().trim().toLowerCase());
        if (maybe.isEmpty()) {
            maybe = userService.findByUsername(req.getEmail().trim());
        }
        if (maybe.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }

        AppUser user = maybe.get();
        if ("ROLE_UNVERIFIED".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Please verify your email first (sign up again to resend OTP)"));
        }
        if (!encoder.matches(req.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }

        String token = jwtService.createToken(user.getUsername(), user.getRole());
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getRole()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req) {
        if (req == null || isBlank(req.getCurrentPassword()) || isBlank(req.getNewPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "currentPassword and newPassword are required", "message", "currentPassword and newPassword are required"));
        }
        if (req.getNewPassword().length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "New password must be at least 6 characters", "message", "New password must be at least 6 characters"));
        }
        AppUser user = userService.requireByUsername(SecurityUtils.currentUsername());
        if (!encoder.matches(req.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Current password is incorrect", "message", "Current password is incorrect"));
        }
        user.setPassword(encoder.encode(req.getNewPassword()));
        userService.save(user);
        return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully"));
    }

    /**
     * Multi-step signup step 1: create user + send JWT-backed OTP (no OTP stored server-side).
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (req == null || req.getOwner() == null
                || req.getOwner().getEmail() == null
                || req.getOwner().getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "owner email and password required"));
        }

        String email = req.getOwner().getEmail().trim().toLowerCase();
        Optional<AppUser> existingOpt = userService.findByUsername(email);
        
        AppUser u;
        if (existingOpt.isPresent()) {
            u = existingOpt.get();
            if (!"ROLE_UNVERIFIED".equals(u.getRole())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Username already exists"));
            }
            // User is unverified, allow overwriting their details
            u.setPassword(encoder.encode(req.getOwner().getPassword()));
            u.setFirstName(req.getOwner().getFirstName());
            u.setLastName(req.getOwner().getLastName());
        } else {
            u = new AppUser();
            u.setUsername(email);
            u.setPassword(encoder.encode(req.getOwner().getPassword()));
            u.setRole("ROLE_UNVERIFIED");
            u.setFirstName(req.getOwner().getFirstName());
            u.setLastName(req.getOwner().getLastName());
        }
        
        userService.save(u);

        IssuedOtp issued = otpService.issue(email, PURPOSE_SIGNUP);
        emailService.sendOtpToUser(email, issued.plainOtp());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("message", "User registered successfully, OTP sent");
        body.put("email", email);
        body.put("verification_token", issued.verificationToken());
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    /**
     * Signup step 2: verify OTP using verification_token from register/resend.
     * On success returns auth JWT (login session).
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest req) {
        if (req == null || isBlank(req.getOtp())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "otp required"));
        }

        String purpose = isBlank(req.getPurpose()) ? PURPOSE_SIGNUP : req.getPurpose();
        String verificationToken = req.getVerificationToken();

        if (isBlank(verificationToken)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error",
                            "verification_token required (returned from register / resend-otp / /api/otp/send)"
                    ));
        }

        VerifyOutcome outcome = otpService.verify(verificationToken, req.getOtp(), purpose);

        return switch (outcome.status()) {
            case SUCCESS -> {
                String email = outcome.identifier();
                if (!isBlank(req.getEmail())
                        && !email.equalsIgnoreCase(req.getEmail().trim())) {
                    yield ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "email does not match verification token"));
                }
                Optional<AppUser> maybe = userService.findByUsername(email);
                if (maybe.isEmpty()) {
                    yield ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("error", "User not found"));
                }
                AppUser user = maybe.get();
                if ("ROLE_UNVERIFIED".equals(user.getRole())) {
                    user.setRole("ROLE_USER");
                    userService.save(user);
                }
                
                String token = jwtService.createToken(user.getUsername(), user.getRole());
                yield ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getRole()));
            }
            case INCORRECT -> {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("success", false);
                body.put("error", outcome.message());
                body.put("verification_token", outcome.verificationToken());
                yield ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
            }
            case TOO_MANY_ATTEMPTS, INVALID_TOKEN, PURPOSE_MISMATCH ->
                    ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("success", false, "error", outcome.message()));
        };
    }

    /**
     * Resend OTP — issues a fresh verification_token (client must replace the old one).
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body) {
        String email = body != null ? body.get("email") : null;
        String purpose = body != null && body.get("purpose") != null
                ? body.get("purpose")
                : PURPOSE_SIGNUP;

        if (isBlank(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "email required"));
        }

        email = email.trim().toLowerCase();
        if (userService.findByUsername(email).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found"));
        }

        try {
            IssuedOtp issued = otpService.issue(email, purpose);
            emailService.sendOtpToUser(email, issued.plainOtp());

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("message", "OTP resent");
            resp.put("verification_token", issued.verificationToken());
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/register-defaults")
    public ResponseEntity<?> registerDefaults() {
        if (!allowDefaultUsers) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Default user seeding is disabled", "message", "Default user seeding is disabled"));
        }
        if (userService.findByUsername("admin").isEmpty()) {
            AppUser admin = new AppUser();
            admin.setUsername("admin");
            admin.setPassword(encoder.encode("admin"));
            admin.setRole("ROLE_ADMIN");
            userService.save(admin);
        }
        if (userService.findByUsername("user").isEmpty()) {
            AppUser user = new AppUser();
            user.setUsername("user");
            user.setPassword(encoder.encode("user"));
            user.setRole("ROLE_USER");
            userService.save(user);
        }
        return ResponseEntity.ok(Map.of("message", "defaults registered (if absent)"));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
