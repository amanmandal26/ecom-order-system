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
    private String email;
    private String name;
    private String role;

    public static AuthResponse fromUser(User user, String token) {
        return AuthResponse.builder()
            .token(token)
            .email(user.getEmail())
            .name(user.getName())
            .role(user.getRole().name())
            .build();
    }
}
