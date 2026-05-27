package com.ecom.productservice.security;

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
                // Seller-specific endpoints — must come BEFORE the broad GET permitAll below
                .requestMatchers(HttpMethod.GET, "/api/products/my-products").hasRole("SELLER")
                .requestMatchers(HttpMethod.PUT, "/api/products/*/restock").hasRole("SELLER")
                // Public read access — catalog is not sensitive; order-service also reads without user JWT
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                // Internal stock mutation endpoints called by order-service — no user JWT attached
                .requestMatchers(HttpMethod.PUT, "/api/products/*/reduce-stock").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/products/*/restore-stock").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/api-docs", "/api-docs/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // No authenticationProvider needed — product-service never issues or validates passwords.
            // Authentication is done entirely by reading claims from the JWT signature.
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

}
