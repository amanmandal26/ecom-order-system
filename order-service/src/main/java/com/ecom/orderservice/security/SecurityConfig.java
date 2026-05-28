package com.ecom.orderservice.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/circuitbreakers").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/api-docs", "/api-docs/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/orders/health/**").hasRole("ADMIN")
                // Place order — sellers can shop as customers
                .requestMatchers(HttpMethod.POST, "/api/orders").hasAnyRole("ADMIN", "CUSTOMER", "SELLER")
                // View own orders — all three roles
                .requestMatchers(HttpMethod.GET, "/api/orders/my-orders").hasAnyRole("ADMIN", "CUSTOMER", "SELLER")
                // View single order — ownership/admin check is done in service layer
                .requestMatchers(HttpMethod.GET, "/api/orders/**").hasAnyRole("ADMIN", "CUSTOMER", "SELLER")
                // Cancel order — all three roles (ownership checked in service)
                .requestMatchers(HttpMethod.PUT, "/api/orders/*/cancel").hasAnyRole("ADMIN", "CUSTOMER", "SELLER")
                // Update status — ADMIN only (also enforced by @PreAuthorize in controller)
                .requestMatchers(HttpMethod.PUT, "/api/orders/*/status").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

}
