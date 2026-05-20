package com.ecom.monolith.dto;

import com.ecom.monolith.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AuthResponse DTO for authentication responses (login/register).
 *
 * Why we return this:
 * - Contains JWT token for subsequent authenticated requests
 * - Provides user info (email, name, role) to frontend without exposing password
 * - Allows frontend to store token in localStorage/sessionStorage
 * - Role field enables conditional UI rendering (admin features vs customer features)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String email;
    private String name;
    private String role;

    /**
     * Factory method to create AuthResponse from User entity and JWT token.
     *
     * @param user the authenticated user
     * @param token the generated JWT token
     * @return AuthResponse with user details and token
     */
    public static AuthResponse fromUser(User user, String token) {
        return AuthResponse.builder()
            .token(token)
            .email(user.getEmail())
            .name(user.getName())
            .role(user.getRole().name())
            .build();
    }
}
