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
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/api-docs", "/api-docs/**").permitAll()
                // Place order — both customers and admins can order
                .requestMatchers(HttpMethod.POST, "/api/orders").hasAnyRole("ADMIN", "CUSTOMER")
                // View own orders — both roles
                .requestMatchers(HttpMethod.GET, "/api/orders/my-orders").hasAnyRole("ADMIN", "CUSTOMER")
                // View single order — ownership/admin check is done in service layer
                .requestMatchers(HttpMethod.GET, "/api/orders/**").hasAnyRole("ADMIN", "CUSTOMER")
                // Cancel order — both roles (ownership checked in service)
                .requestMatchers(HttpMethod.PUT, "/api/orders/*/cancel").hasAnyRole("ADMIN", "CUSTOMER")
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
