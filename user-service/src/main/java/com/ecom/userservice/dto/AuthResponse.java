package com.ecom.userservice.dto;

import com.ecom.userservice.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String refreshToken;
    private String email;
    private String name;
    private String role;

    // Used by register() which doesn't issue a refresh token yet
    public static AuthResponse fromUser(User user, String token) {
        return fromUser(user, token, null);
    }

    // Used by login() — both tokens returned together
    public static AuthResponse fromUser(User user, String token, String refreshToken) {
        return AuthResponse.builder()
            .token(token)
            .refreshToken(refreshToken)
            .email(user.getEmail())
            .name(user.getName())
            .role(user.getRole().name())
            .build();
    }
}
