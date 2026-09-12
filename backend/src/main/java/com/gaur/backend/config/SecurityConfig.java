package com.gaur.backend.config;

import com.gaur.backend.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserService userService;
    private final JwtAuthFilter jwtAuthFilter;
    private final OtpRateLimitFilter otpRateLimitFilter;

    public SecurityConfig(UserService userService, JwtAuthFilter jwtAuthFilter, OtpRateLimitFilter otpRateLimitFilter) {
        this.userService = userService;
        this.jwtAuthFilter = jwtAuthFilter;
        this.otpRateLimitFilter = otpRateLimitFilter;
    }

    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration(JwtAuthFilter filter) {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<OtpRateLimitFilter> otpRateLimitFilterRegistration(OtpRateLimitFilter filter) {
        FilterRegistrationBean<OtpRateLimitFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }


    @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,https://*.vercel.app}")
    private String allowedOriginsCsv;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userService.findByUsername(username)
                .map(u -> User.withUsername(u.getUsername())
                        .password(u.getPassword())
                        .roles(u.getRole() != null ? u.getRole().replace("ROLE_", "") : "USER")
                        .build())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Bean
    public AuthenticationEntryPoint restAuthenticationEntryPoint() {
        return (HttpServletRequest request, HttpServletResponse response, org.springframework.security.core.AuthenticationException authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            String msg = "{\"error\":\"Unauthorized\",\"message\":\"" + authException.getMessage() + "\"}";
            try {
                response.getWriter().write(msg);
            } catch (IOException ignored) { }
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        // Allowed origin patterns - configurable via env/property
        List<String> origins = Arrays.stream(allowedOriginsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        if (origins.isEmpty()) origins = List.of("*");
        if (!origins.contains("*")) origins.add("*");
        cfg.setAllowedOriginPatterns(origins);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization"));
        cfg.setAllowCredentials(false);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // apply to all paths
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .securityContext(sc -> sc
                        .requireExplicitSave(false)
                        .securityContextRepository(new RequestAttributeSecurityContextRepository())
                )
                .exceptionHandling(e -> e.authenticationEntryPoint(restAuthenticationEntryPoint()))
                .authorizeHttpRequests(auth -> auth
                        // --- YE LINE ADD KAREIN ---
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        // --------------------------

                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/verify-otp",
                                "/api/auth/resend-otp",
                                "/api/auth/register-defaults",
                                "/api/otp/**",
                                "/auth/**",
                                "/actuator/**"
                        ).permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/public/**", "/static/**").permitAll()
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(otpRateLimitFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

//    @Bean
//    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
//        http
//                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
//                .csrf(csrf -> csrf.disable())
//                .exceptionHandling(e -> e.authenticationEntryPoint(restAuthenticationEntryPoint()))
//                .authorizeHttpRequests(auth -> auth
//                        // allow public auth endpoints and actuator
//                        .requestMatchers("/api/auth/**", "/auth/**", "/actuator/**").permitAll()
//                        // admin endpoints
//                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
//                        // static or public resources if any
//                        .requestMatchers("/public/**", "/static/**").permitAll()
//                        // other endpoints require auth
//                        .anyRequest().authenticated()
//                );
//
//        // register JWT filter BEFORE UsernamePasswordAuthenticationFilter
//        http.addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);
//
//        return http.build();
//    }
}
