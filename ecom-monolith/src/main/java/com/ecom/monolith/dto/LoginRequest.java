package com.ecom.monolith.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * LoginRequest DTO for user login endpoint.
 *
 * Design notes:
 * - Minimal fields for security: only email and password needed
 * - No user ID, role, or other internal data in request
 * - Validation prevents malformed requests reaching authentication logic
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}
