package com.ecom.userservice.controller;

import com.ecom.userservice.dto.ApiResponse;
import com.ecom.userservice.dto.AuthResponse;
import com.ecom.userservice.dto.LoginRequest;
import com.ecom.userservice.dto.RegisterRequest;
import com.ecom.userservice.service.UserService;
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
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Register request: {}", request.getEmail());
        AuthResponse auth = userService.register(request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("User registered successfully", auth));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request: {}", request.getEmail());
        AuthResponse auth = userService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", auth));
    }
}
