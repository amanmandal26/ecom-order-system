package com.ecom.userservice.controller;

import com.ecom.userservice.dto.ApiResponse;
import com.ecom.userservice.dto.AuthResponse;
import com.ecom.userservice.dto.ForgotPasswordRequest;
import com.ecom.userservice.dto.LoginRequest;
import com.ecom.userservice.dto.RefreshTokenRequest;
import com.ecom.userservice.dto.RegisterRequest;
import com.ecom.userservice.dto.ResetPasswordRequest;
import com.ecom.userservice.dto.TokenRefreshResponse;
import com.ecom.userservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Register and login endpoints — no JWT required")
public class AuthController {

    private final UserService userService;

    @Operation(summary = "Register new user", description = "Creates a new user account and returns a JWT token")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Register request: {}", request.getEmail());
        AuthResponse auth = userService.register(request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("User registered successfully", auth));
    }

    @Operation(summary = "Login and get JWT token", description = "Returns a signed JWT. Copy the token and use it in the Authorize button above.")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request: {}", request.getEmail());
        AuthResponse auth = userService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", auth));
    }

    @Operation(summary = "Request password reset email", description = "Sends a reset link to the email if it exists. Always returns success to prevent email enumeration.")
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Forgot password request: {}", request.getEmail());
        String message = userService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(message, null));
    }

    @Operation(summary = "Reset password using token", description = "Validates the reset token and updates the user's password.")
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Reset password request with token: {}", request.getToken());
        String message = userService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(message, null));
    }

    @Operation(summary = "Refresh access token",
        description = "Exchanges a valid refresh token for a new access token (15 min) and a new refresh token (30 days). " +
                      "The old refresh token is deleted immediately — token rotation prevents replay attacks.")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        TokenRefreshResponse response = userService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed successfully", response));
    }

    @Operation(summary = "Logout",
        description = "Deletes the refresh token from the database. The access token will expire naturally in 15 minutes. " +
                      "Requires a valid JWT in the Authorization header.")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody RefreshTokenRequest request) {
        userService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }
}
