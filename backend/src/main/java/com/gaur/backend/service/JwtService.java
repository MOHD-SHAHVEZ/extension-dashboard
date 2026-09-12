package com.gaur.backend.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {
    private static final long MIN_TTL_MS = 86_400_000L; // 24h

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expirationMs:86400000}")
    private long expMs;

    public String createToken(String username, String role) {
        long ttl = expMs < 60_000L ? MIN_TTL_MS : expMs;
        Algorithm alg = Algorithm.HMAC256(secret);
        Date now = new Date();
        return JWT.create()
                .withSubject(username)
                .withClaim("role", role == null ? "ROLE_USER" : role)
                .withIssuedAt(now)
                .withExpiresAt(new Date(now.getTime() + ttl))
                .sign(alg);
    }

    public String getUsernameFromToken(DecodedJWT jwt) {
        return jwt.getSubject();
    }

    public DecodedJWT verify(String token) {
        Algorithm alg = Algorithm.HMAC256(secret);
        return JWT.require(alg)
                .acceptLeeway(30)
                .build()
                .verify(token);
    }
}
