package com.ecom.productservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class AppConfig {
    // No PasswordEncoder bean — product-service never stores or verifies passwords.
    // JWT validation is done purely via signature + claims in JwtAuthFilter.
}
