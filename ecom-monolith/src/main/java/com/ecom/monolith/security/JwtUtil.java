package com.ecom.monolith.security;

import com.ecom.monolith.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

/**
 * JwtUtil handles JWT token creation, parsing, and validation.
 *
 * JWT (JSON Web Token) structure:
 * - Header: token type and algorithm (HS256)
 * - Payload: claims (username, roles, expiration, etc.)
 * - Signature: ensures token hasn't been tampered with
 *
 * Flow:
 * 1. User logs in → generateToken() creates JWT
 * 2. Client sends JWT in Authorization header: "Bearer <token>"
 * 3. JwtAuthFilter extracts and validates token
 * 4. If valid, SecurityContext is populated with user info
 * 5. Request proceeds with authenticated user
 *
 * Security notes:
 * - Secret key must be at least 256 bits (32 bytes) for HS256
 * - Token expiration prevents long-lived tokens
 * - Signature verification prevents tampering
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtUtil {

    private final JwtProperties jwtProperties;

    /**
     * Generate a JWT token for a user.
     *
     * @param userDetails the authenticated user (from UserDetails)
     * @return signed JWT token string
     */
    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .setSubject(userDetails.getUsername())  // username = email
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + jwtProperties.getExpiration()))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    /**
     * Extract username (email) from a JWT token.
     *
     * @param token the JWT token string
     * @return the username (email) claim
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extract expiration date from a JWT token.
     *
     * @param token the JWT token string
     * @return the expiration date claim
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Generic method to extract any claim from a token.
     *
     * @param <T> the type of the claim
     * @param token the JWT token string
     * @param claimsResolver function to extract specific claim
     * @return the extracted claim
     */
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        try {
            final Claims claims = extractAllClaims(token);
            return claimsResolver.apply(claims);
        } catch (Exception e) {
            log.error("Error extracting claim from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Parse and extract all claims from a JWT token.
     *
     * @param token the JWT token string
     * @return the parsed claims
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(token)
            .getBody();
    }

    /**
     * Check if a JWT token has expired.
     *
     * @param token the JWT token string
     * @return true if token is expired, false otherwise
     */
    private Boolean isTokenExpired(String token) {
        try {
            Date expiration = extractExpiration(token);
            return expiration != null && expiration.before(new Date());
        } catch (Exception e) {
            log.error("Error checking token expiration: {}", e.getMessage());
            return true;  // Treat parsing errors as expired
        }
    }

    /**
     * Validate a JWT token against UserDetails.
     *
     * @param token the JWT token string
     * @param userDetails the user to validate against
     * @return true if token is valid and not expired, false otherwise
     */
    public Boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Get the signing key for JWT operations.
     * Uses the secret from application properties.
     * JJWT requires the key to be at least 256 bits for HS256.
     *
     * @return the SecretKey for signing/verification
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
