package com.ecom.monolith.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * RegisterRequest DTO for user registration endpoint.
 *
 * Why we use DTOs:
 * - Decouples API contract from entity structure
 * - Allows different validation rules for input vs database
 * - Hides internal fields (e.g., id, createdAt) from API
 * - Enables versioning without breaking clients
 *
 * Validation:
 * - @NotBlank ensures fields are not empty or whitespace-only
 * - @Email validates email format and prevents basic typos
 * - Validation happens before controller method execution
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}
