package com.ecom.monolith.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * AppConfig holds application-wide beans that don't belong to a specific layer.
 *
 * Why a separate class for PasswordEncoder?
 * SecurityConfig needs UserService (for UserDetailsService).
 * UserService needs PasswordEncoder.
 * If PasswordEncoder lived inside SecurityConfig, Spring would see:
 *   SecurityConfig → UserService → PasswordEncoder (in SecurityConfig) → circular!
 * Putting PasswordEncoder here breaks that cycle — AppConfig has no dependencies.
 *
 * @EnableConfigurationProperties registers JwtProperties so the IDE recognises
 * jwt.* keys in application.properties and stops flagging them as unknown.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
