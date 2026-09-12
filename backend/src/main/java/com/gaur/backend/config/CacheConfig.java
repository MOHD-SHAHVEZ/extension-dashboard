package com.gaur.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * L1 cache for dashboard/task/schedule reads.
 * Swap this bean for RedisCacheManager when running a multi-instance cluster
 * (set SPRING_DATA_REDIS_HOST / app.redis.enabled).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(
                "tasks",
                "schedule",
                "summaries",
                "dashboard"
        );
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(90))
                .maximumSize(20_000)
                .recordStats());
        return manager;
    }
}
