package com.ecom.monolith.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Type-safe binding for all jwt.* properties in application.properties.
 *
 * @ConfigurationProperties tells Spring Boot to map jwt.secret → secret field,
 * jwt.expiration → expiration field. The IDE reads this class and stops
 * flagging jwt.* as "unknown property" warnings.
 *
 * Why this is better than @Value:
 * - IDE auto-completes jwt.* keys in .properties files
 * - One place to see all JWT config (no hunting for @Value annotations)
 * - Type-safe: expiration is a long, not a string that might be mis-parsed
 */
@ConfigurationProperties(prefix = "jwt")
@Getter
@Setter
public class JwtProperties {

    /** Signing secret — must be at least 32 characters (256 bits) for HS256. */
    private String secret;

    /** Token validity in milliseconds. Default: 86400000 (24 hours). */
    private long expiration;
}
