package com.ecom.monolith.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JwtAuthFilter intercepts HTTP requests and validates JWT tokens.
 *
 * Filter lifecycle:
 * 1. Request arrives → JwtAuthFilter.doFilterInternal() is called
 * 2. Extract Authorization header
 * 3. If header contains "Bearer <token>", extract token
 * 4. Validate token using JwtUtil
 * 5. Load user details from database
 * 6. Create Authentication token and set in SecurityContext
 * 7. Request proceeds as authenticated user
 *
 * Why OncePerRequestFilter:
 * - Ensures filter runs exactly once per request (even with forwards/includes)
 * - Cleaner than Filter interface
 *
 * Security context flow:
 * - After authentication, SecurityContextHolder.getContext().getAuthentication()
 *   contains the authenticated user for use in controllers and services
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Extract JWT token from Authorization header
            final String authHeader = request.getHeader("Authorization");
            final String jwt;
            final String userEmail;

            // Check if Authorization header exists and starts with "Bearer "
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                // No token provided; continue to next filter (anonymous request)
                filterChain.doFilter(request, response);
                return;
            }

            // Extract token (remove "Bearer " prefix)
            jwt = authHeader.substring(7);
            log.debug("JWT token extracted from Authorization header");

            // Extract username (email) from token
            userEmail = jwtUtil.extractUsername(jwt);

            // If token is invalid or username is null, continue without authentication
            if (userEmail == null) {
                log.warn("Failed to extract username from JWT token");
                filterChain.doFilter(request, response);
                return;
            }

            // Check if user is not already authenticated in the current context
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                // Load user details from database
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                // Validate token against user details
                if (jwtUtil.isTokenValid(jwt, userDetails)) {
                    log.debug("JWT token validated successfully for user: {}", userEmail);

                    // Create authentication token
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Set authentication in the SecurityContext
                    SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
                    securityContext.setAuthentication(authToken);
                    SecurityContextHolder.setContext(securityContext);

                    log.debug("SecurityContext populated with authentication for user: {}", userEmail);
                } else {
                    log.warn("JWT token validation failed for user: {}", userEmail);
                }
            }
        } catch (Exception e) {
            log.error("Error processing JWT token: {}", e.getMessage());
            // Continue without authentication; let authorization filter handle the response
        }

        // Continue to next filter in the chain
        filterChain.doFilter(request, response);
    }
}
