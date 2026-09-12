package com.gaur.backend.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Date;
import java.util.HexFormat;
import java.util.Set;

/**
 * Stateless OTP via signed JWT — no DB / Redis / in-memory OTP store.
 *
 * JWT payload (verification_token):
 *   identifier  — email or phone
 *   otp_hash    — HMAC-SHA256(otp, OTP_SALT) hex
 *   purpose     — signup | login | reset-password | …
 *   attempts    — failed verify count (max 5)
 *   token_type  — always "otp" (so auth filter ignores it)
 *   iat / exp   — issued at / expiry (5 minutes)
 */
@Service
public class OtpService {

    public static final String TOKEN_TYPE_OTP = "otp";
    public static final int MAX_ATTEMPTS = 5;
    public static final long OTP_TTL_MS = 5 * 60 * 1000L;

    private static final Set<String> ALLOWED_PURPOSES = Set.of(
            "signup", "login", "reset-password", "verify-email"
    );

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.otp.salt}")
    private String otpSalt;

    /** Result of send: client keeps verificationToken; plain OTP is only for delivery. */
    public record IssuedOtp(String verificationToken, String plainOtp) {}

    /**
     * Verify outcomes:
     * - SUCCESS
     * - INVALID_TOKEN (bad/expired JWT)
     * - PURPOSE_MISMATCH
     * - TOO_MANY_ATTEMPTS
     * - INCORRECT (includes refreshed verificationToken with attempts+1)
     */
    public record VerifyOutcome(
            Status status,
            String message,
            String verificationToken,
            String identifier,
            String purpose
    ) {
        public enum Status {
            SUCCESS, INVALID_TOKEN, PURPOSE_MISMATCH, TOO_MANY_ATTEMPTS, INCORRECT
        }
    }

    public void assertValidPurpose(String purpose) {
        if (purpose == null || !ALLOWED_PURPOSES.contains(purpose.trim().toLowerCase())) {
            throw new IllegalArgumentException(
                    "purpose must be one of: " + String.join(", ", ALLOWED_PURPOSES)
            );
        }
    }

    /** Cryptographically secure 6-digit numeric OTP (100000–999999). */
    public String generateNumericOtp() {
        int value = 100_000 + secureRandom.nextInt(900_000);
        return String.valueOf(value);
    }

    /** HMAC-SHA256(otp, OTP_SALT) → lowercase hex. */
    public String hashOtp(String otp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(otpSalt.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(otp.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to hash OTP", e);
        }
    }

    public IssuedOtp issue(String identifier, String purpose) {
        assertValidPurpose(purpose);
        String normalizedPurpose = purpose.trim().toLowerCase();
        String normalizedId = identifier.trim().toLowerCase();
        String plainOtp = generateNumericOtp();
        String otpHash = hashOtp(plainOtp);
        String token = signVerificationToken(normalizedId, otpHash, normalizedPurpose, 0, null);
        return new IssuedOtp(token, plainOtp);
    }

    public VerifyOutcome verify(String verificationToken, String submittedOtp, String purpose) {
        if (verificationToken == null || verificationToken.isBlank()
                || submittedOtp == null || submittedOtp.isBlank()
                || purpose == null || purpose.isBlank()) {
            return new VerifyOutcome(
                    VerifyOutcome.Status.INVALID_TOKEN,
                    "OTP expired or invalid, please resend",
                    null, null, null
            );
        }

        final DecodedJWT jwt;
        try {
            jwt = verifyJwt(verificationToken);
        } catch (JWTVerificationException | IllegalArgumentException ex) {
            return new VerifyOutcome(
                    VerifyOutcome.Status.INVALID_TOKEN,
                    "OTP expired or invalid, please resend",
                    null, null, null
            );
        }

        if (!TOKEN_TYPE_OTP.equals(jwt.getClaim("token_type").asString())) {
            return new VerifyOutcome(
                    VerifyOutcome.Status.INVALID_TOKEN,
                    "OTP expired or invalid, please resend",
                    null, null, null
            );
        }

        String tokenPurpose = jwt.getClaim("purpose").asString();
        String requestPurpose = purpose.trim().toLowerCase();
        if (tokenPurpose == null || !tokenPurpose.equals(requestPurpose)) {
            return new VerifyOutcome(
                    VerifyOutcome.Status.PURPOSE_MISMATCH,
                    "OTP purpose mismatch — use the token from the correct flow",
                    null, null, null
            );
        }

        String identifier = jwt.getClaim("identifier").asString();
        String otpHash = jwt.getClaim("otp_hash").asString();
        Integer attempts = jwt.getClaim("attempts").asInt();
        if (attempts == null) attempts = 0;

        if (attempts >= MAX_ATTEMPTS) {
            return new VerifyOutcome(
                    VerifyOutcome.Status.TOO_MANY_ATTEMPTS,
                    "Too many attempts, please request a new OTP",
                    null, identifier, tokenPurpose
            );
        }

        String submittedHash = hashOtp(submittedOtp.trim());
        if (!constantTimeEqualsHex(otpHash, submittedHash)) {
            int nextAttempts = attempts + 1;
            if (nextAttempts >= MAX_ATTEMPTS) {
                return new VerifyOutcome(
                        VerifyOutcome.Status.TOO_MANY_ATTEMPTS,
                        "Too many attempts, please request a new OTP",
                        null, identifier, tokenPurpose
                );
            }
            String refreshed = signVerificationToken(
                    identifier, otpHash, tokenPurpose, nextAttempts, jwt.getExpiresAt()
            );
            return new VerifyOutcome(
                    VerifyOutcome.Status.INCORRECT,
                    "Incorrect OTP, try again",
                    refreshed, identifier, tokenPurpose
            );
        }

        return new VerifyOutcome(
                VerifyOutcome.Status.SUCCESS,
                "OTP verified successfully",
                null, identifier, tokenPurpose
        );
    }

    private String signVerificationToken(
            String identifier,
            String otpHash,
            String purpose,
            int attempts,
            Date existingExpiresAt
    ) {
        Algorithm alg = Algorithm.HMAC256(jwtSecret);
        Date now = new Date();
        Date exp = existingExpiresAt != null
                ? existingExpiresAt
                : new Date(now.getTime() + OTP_TTL_MS);

        return JWT.create()
                .withClaim("identifier", identifier)
                .withClaim("otp_hash", otpHash)
                .withClaim("purpose", purpose)
                .withClaim("attempts", attempts)
                .withClaim("token_type", TOKEN_TYPE_OTP)
                .withIssuedAt(now)
                .withExpiresAt(exp)
                .sign(alg);
    }

    private DecodedJWT verifyJwt(String token) {
        Algorithm alg = Algorithm.HMAC256(jwtSecret);
        return JWT.require(alg)
                .withClaim("token_type", TOKEN_TYPE_OTP)
                .build()
                .verify(token);
    }

    /** Constant-time compare for equal-length hex strings. */
    static boolean constantTimeEqualsHex(String a, String b) {
        if (a == null || b == null) return false;
        byte[] left = a.getBytes(StandardCharsets.UTF_8);
        byte[] right = b.getBytes(StandardCharsets.UTF_8);
        if (left.length != right.length) {
            // still run a dummy compare to reduce length-leak signal
            MessageDigest.isEqual(left, left);
            return false;
        }
        return MessageDigest.isEqual(left, right);
    }
}
