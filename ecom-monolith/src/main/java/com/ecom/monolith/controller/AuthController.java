package com.ecom.monolith.controller;

import com.ecom.monolith.dto.ApiResponse;
import com.ecom.monolith.dto.AuthResponse;
import com.ecom.monolith.dto.LoginRequest;
import com.ecom.monolith.dto.RegisterRequest;
import com.ecom.monolith.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController — public endpoints for registration and login.
 *
 * Both endpoints are open (/api/auth/** is permitted in SecurityConfig).
 * Errors are handled centrally by GlobalExceptionHandler, so these methods
 * contain only the happy path — no try/catch needed here.
 *
 * POST /api/auth/register → 201 + { success, message, data: AuthResponse }
 * POST /api/auth/login    → 200 + { success, message, data: AuthResponse }
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;

    /**
     * Register a new user.
     * 201 on success. GlobalExceptionHandler returns 409 if email is taken, 400 if validation fails.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Register request: {}", request.getEmail());
        AuthResponse auth = userService.register(request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("User registered successfully", auth));
    }

    /**
     * Authenticate a user and return a JWT token.
     * 200 on success. GlobalExceptionHandler returns 401 on bad credentials.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request: {}", request.getEmail());
        AuthResponse auth = userService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", auth));
    }
}
