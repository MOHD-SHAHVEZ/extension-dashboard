package com.gaur.backend.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    /** 7 days */
    private static final long DEFAULT_ACCESS_TTL_MS = 604_800_000L;
    /** 30 days */
    private static final long DEFAULT_REFRESH_TTL_MS = 2_592_000_000L;
    private static final long MIN_TTL_MS = 60_000L;

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expirationMs:604800000}")
    private long accessExpMs;

    @Value("${app.jwt.refreshExpirationMs:2592000000}")
    private long refreshExpMs;

    public String createToken(String username, String role) {
        return createAccessToken(username, role);
    }

    public String createAccessToken(String username, String role) {
        long ttl = accessExpMs < MIN_TTL_MS ? DEFAULT_ACCESS_TTL_MS : accessExpMs;
        return sign(username, role, TYPE_ACCESS, ttl);
    }

    public String createRefreshToken(String username, String role) {
        long ttl = refreshExpMs < MIN_TTL_MS ? DEFAULT_REFRESH_TTL_MS : refreshExpMs;
        return sign(username, role, TYPE_REFRESH, ttl);
    }

    public long getAccessExpirationMs() {
        return accessExpMs < MIN_TTL_MS ? DEFAULT_ACCESS_TTL_MS : accessExpMs;
    }

    public long getAccessExpiresInSeconds() {
        return getAccessExpirationMs() / 1000L;
    }

    public String getUsernameFromToken(DecodedJWT jwt) {
        return jwt.getSubject();
    }

    public String getRoleFromToken(DecodedJWT jwt) {
        String role = jwt.getClaim("role").asString();
        return role == null || role.isBlank() ? "ROLE_USER" : role;
    }

    public String getTokenType(DecodedJWT jwt) {
        String type = jwt.getClaim("type").asString();
        if (type == null || type.isBlank()) {
            // Legacy tokens (no type claim) are treated as access tokens.
            return TYPE_ACCESS;
        }
        return type;
    }

    public boolean isAccessToken(DecodedJWT jwt) {
        return TYPE_ACCESS.equals(getTokenType(jwt));
    }

    public boolean isRefreshToken(DecodedJWT jwt) {
        return TYPE_REFRESH.equals(getTokenType(jwt));
    }

    /** Verify any signed JWT (access or refresh). */
    public DecodedJWT verify(String token) {
        Algorithm alg = Algorithm.HMAC256(secret);
        return JWT.require(alg)
                .acceptLeeway(30)
                .build()
                .verify(token);
    }

    /**
     * Verify a token that may be used to mint a new access token:
     * refresh tokens, or still-valid access tokens (sliding renewal).
     */
    public DecodedJWT verifyForRefresh(String token) {
        DecodedJWT jwt = verify(token);
        String type = getTokenType(jwt);
        if (!TYPE_REFRESH.equals(type) && !TYPE_ACCESS.equals(type)) {
            throw new IllegalArgumentException("Unsupported token type for refresh");
        }
        return jwt;
    }

    private String sign(String username, String role, String type, long ttlMs) {
        Algorithm alg = Algorithm.HMAC256(secret);
        Date now = new Date();
        return JWT.create()
                .withSubject(username)
                .withClaim("role", role == null ? "ROLE_USER" : role)
                .withClaim("type", type)
                .withIssuedAt(now)
                .withExpiresAt(new Date(now.getTime() + ttlMs))
                .sign(alg);
    }
}
