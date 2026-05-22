package com.ecom.userservice.controller;

import com.ecom.userservice.dto.ApiResponse;
import com.ecom.userservice.dto.AuthResponse;
import com.ecom.userservice.dto.LoginRequest;
import com.ecom.userservice.dto.RegisterRequest;
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
}
