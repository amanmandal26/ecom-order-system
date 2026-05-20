package com.ecom.monolith.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * SecurityConfig configures Spring Security for JWT-based authentication.
 *
 * Security architecture:
 * 1. CORS enabled for React frontend on localhost:3000
 * 2. Session management disabled (stateless JWT-based auth)
 * 3. /api/auth/** endpoints permit all (public registration/login)
 * 4. All other endpoints require authentication
 * 5. JwtAuthFilter validates tokens and sets SecurityContext
 * 6. BCryptPasswordEncoder hashes passwords (prevents rainbow table attacks)
 *
 * Request flow for protected endpoints:
 * 1. Client sends Authorization: Bearer <token> header
 * 2. JwtAuthFilter intercepts, validates token, populates SecurityContext
 * 3. Authorization checks pass (user authenticated)
 * 4. Controller logic executes
 *
 * Request flow for public endpoints (/api/auth/**):
 * 1. No token required
 * 2. Filter chain passes without authentication
 * 3. Controller handles registration/login
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder; // injected from AppConfig — breaks circular dependency

    /**
     * Configure the HTTP security filter chain.
     *
     * @param http the HttpSecurity object to configure
     * @return SecurityFilterChain configured for JWT-based authentication
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF (not needed for stateless JWT auth)
            .csrf(csrf -> csrf.disable())

            // Enable CORS with configured settings
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Configure endpoint authorization
            .authorizeHttpRequests(auth -> auth
                // Public endpoints (no auth required)
                .requestMatchers("/api/auth/**").permitAll()

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

            // Disable session creation (stateless JWT auth)
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            // This ensures JWT validation happens before Spring Security's default auth
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configure CORS to allow requests from React frontend.
     *
     * CORS (Cross-Origin Resource Sharing) required because:
     * - Frontend runs on localhost:3000
     * - Backend runs on localhost:8080
     * - Different ports = different origins (security boundary)
     *
     * @return CorsConfigurationSource with allowed origins and methods
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow requests from React frontend
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://127.0.0.1:3000"));

        // Allow common HTTP methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Allow headers (especially Authorization for JWT tokens)
        configuration.setAllowedHeaders(Arrays.asList("*"));

        // Allow credentials (cookies, if needed)
        configuration.setAllowCredentials(true);

        // Cache CORS configuration for 1 hour (3600 seconds)
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Define the authentication provider.
     *
     * Uses DAO (database) authentication:
     * 1. Loads user from database using UserDetailsService
     * 2. Compares provided password with stored BCrypt hash
     * 3. Returns Authentication token if credentials valid
     *
     * @return AuthenticationProvider for credential validation
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

    /**
     * Expose AuthenticationManager as a bean.
     * AuthenticationConfiguration provides the default manager wired with our UserDetailsService + PasswordEncoder.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
