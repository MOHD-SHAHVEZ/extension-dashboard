package com.gaur.backend.service;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.Date;
@Service
public class JwtService {
    @Value("${app.jwt.secret}") private String secret;
    @Value("${app.jwt.expirationMs}") private long expMs;
    public String createToken(String username, String role){
        Algorithm alg = Algorithm.HMAC256(secret);
        return JWT.create()
                .withSubject(username)
                .withClaim("role", role)
                .withExpiresAt(new Date(System.currentTimeMillis() + expMs))
                .sign(alg);
    }
    public String getUsernameFromToken(com.auth0.jwt.interfaces.DecodedJWT jwt){ return jwt.getSubject(); }
    public com.auth0.jwt.interfaces.DecodedJWT verify(String token){
        Algorithm alg = Algorithm.HMAC256(secret);
        return JWT.require(alg).build().verify(token);
    }
}
