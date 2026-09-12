package com.gaur.backend.controller;

import com.gaur.backend.dto.SendOtpRequest;
import com.gaur.backend.dto.VerifyOtpRequest;
import com.gaur.backend.service.EmailService;
import com.gaur.backend.service.OtpService;
import com.gaur.backend.service.OtpService.IssuedOtp;
import com.gaur.backend.service.OtpService.VerifyOutcome;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Stateless OTP API — all OTP state lives inside verification_token (JWT).
 *
 * POST /api/otp/send
 * POST /api/otp/verify
 */
@RestController
@RequestMapping("/api/otp")
public class OtpController {

    private final OtpService otpService;
    private final EmailService emailService;

    public OtpController(OtpService otpService, EmailService emailService) {
        this.otpService = otpService;
        this.emailService = emailService;
    }

    @PostMapping("/send")
    public ResponseEntity<?> send(@RequestBody SendOtpRequest req) {
        if (req == null || isBlank(req.getIdentifier()) || isBlank(req.getPurpose())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "identifier and purpose are required"
            ));
        }

        try {
            IssuedOtp issued = otpService.issue(req.getIdentifier(), req.getPurpose());
            emailService.sendOtpToUser(req.getIdentifier().trim().toLowerCase(), issued.plainOtp());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("message", "OTP sent");
            body.put("verification_token", issued.verificationToken());
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", ex.getMessage()
            ));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody VerifyOtpRequest req) {
        if (req == null || isBlank(req.getVerificationToken())
                || isBlank(req.getOtp()) || isBlank(req.getPurpose())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "verification_token, otp, and purpose are required"
            ));
        }

        VerifyOutcome outcome = otpService.verify(
                req.getVerificationToken(),
                req.getOtp(),
                req.getPurpose()
        );

        return switch (outcome.status()) {
            case SUCCESS -> ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", outcome.message()
            ));
            case INCORRECT -> {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("success", false);
                body.put("error", outcome.message());
                body.put("verification_token", outcome.verificationToken());
                yield ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
            }
            case TOO_MANY_ATTEMPTS, INVALID_TOKEN, PURPOSE_MISMATCH ->
                    ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                            "success", false,
                            "error", outcome.message()
                    ));
        };
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
