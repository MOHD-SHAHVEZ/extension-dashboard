package com.gaur.backend.config;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.gaur.backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;
    private final SecurityContextRepository securityContextRepository =
            new RequestAttributeSecurityContextRepository();

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
        log.info("JwtAuthFilter registered");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        String path = requestPath(request);
        return path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/register")
                || path.startsWith("/api/auth/verify-otp")
                || path.startsWith("/api/auth/resend-otp")
                || path.startsWith("/api/auth/refresh")
                || path.startsWith("/api/otp");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = firstHeader(req, "Authorization");
        if (header == null || header.isBlank()) {
            log.debug("No Authorization header for {} {}", req.getMethod(), req.getRequestURI());
            chain.doFilter(req, res);
            return;
        }

        String token = extractBearer(header);
        if (token == null) {
            log.warn("Authorization header is not Bearer for {} {}", req.getMethod(), req.getRequestURI());
            chain.doFilter(req, res);
            return;
        }
        String peeked = peekTokenType(token);
        if ("otp".equals(peeked)) {
            log.debug("Ignoring OTP verification token on {} {}", req.getMethod(), req.getRequestURI());
            chain.doFilter(req, res);
            return;
        }
        if ("refresh".equals(peeked)) {
            log.debug("Ignoring refresh token on protected route {} {}", req.getMethod(), req.getRequestURI());
            chain.doFilter(req, res);
            return;
        }

        try {
            DecodedJWT decoded = jwtService.verify(token);
            if (jwtService.isRefreshToken(decoded)) {
                log.debug("Refresh token cannot authenticate {} {}", req.getMethod(), req.getRequestURI());
                chain.doFilter(req, res);
                return;
            }

            String user = decoded.getSubject();
            if (user == null || user.isBlank()) {
                log.warn("JWT has empty subject for {} {}", req.getMethod(), req.getRequestURI());
                chain.doFilter(req, res);
                return;
            }

            String role = jwtService.getRoleFromToken(decoded);
            String authority = role.startsWith("ROLE_") ? role : "ROLE_" + role;

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            List.of(new SimpleGrantedAuthority(authority))
                    );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, req, res);
        } catch (Exception ex) {
            log.warn("JWT rejected for {} {}: {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
            SecurityContextHolder.clearContext();
        }

        chain.doFilter(req, res);
    }

    private static String requestPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (uri == null) uri = "";
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            uri = uri.substring(context.length());
        }
        if (uri.isEmpty()) {
            String servletPath = request.getServletPath();
            return servletPath == null ? "" : servletPath;
        }
        return uri;
    }

    private static String firstHeader(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        if (value != null) return value;
        var names = request.getHeaderNames();
        if (names == null) return null;
        while (names.hasMoreElements()) {
            String candidate = names.nextElement();
            if (name.equalsIgnoreCase(candidate)) {
                return request.getHeader(candidate);
            }
        }
        return null;
    }

    private static String extractBearer(String header) {
        String value = header.trim();
        if (value.length() > 7 && value.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = value.substring(7).trim();
            return token.isEmpty() ? null : token;
        }
        return null;
    }

    private static String peekTokenType(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String json = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            if (json.contains("\"token_type\":\"otp\"")) return "otp";
            if (json.contains("\"type\":\"refresh\"")) return "refresh";
            if (json.contains("\"type\":\"access\"")) return "access";
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }
}
