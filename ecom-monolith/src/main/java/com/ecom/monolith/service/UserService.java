package com.ecom.monolith.service;

import com.ecom.monolith.dto.AuthResponse;
import com.ecom.monolith.dto.LoginRequest;
import com.ecom.monolith.dto.RegisterRequest;
import com.ecom.monolith.entity.User;
import com.ecom.monolith.exception.UserAlreadyExistsException;
import com.ecom.monolith.repository.UserRepository;
import com.ecom.monolith.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * UserService handles user registration, login, and user detail loading for Spring Security.
 *
 * Why we don't inject AuthenticationManager here:
 * AuthenticationManager is built by SecurityConfig, which needs UserDetailsService (= this class).
 * Injecting it here would create a circular dependency that Spring Boot 3.x refuses to start with.
 * Instead, login() loads the user directly and verifies the password with PasswordEncoder — the same
 * thing AuthenticationManager does internally — which keeps things simple and cycle-free.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * Load user by email for Spring Security.
     * Called by JwtAuthFilter when validating tokens on every protected request.
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> {
                log.warn("User not found: {}", email);
                return new UsernameNotFoundException("User not found: " + email);
            });
    }

    /**
     * Register a new user.
     * Throws UserAlreadyExistsException (409) if the email is taken.
     * Password is BCrypt-encoded before storage — plaintext is never saved.
     */
    public AuthResponse register(RegisterRequest request) {
        log.info("Registering user: {}", request.getEmail());

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .build(); // role defaults to CUSTOMER via @Builder.Default

        user = userRepository.save(user);
        log.info("User registered with id: {}", user.getId());

        return AuthResponse.fromUser(user, jwtUtil.generateToken(user));
    }

    /**
     * Authenticate a user and return a JWT token.
     * Throws UsernameNotFoundException (mapped to 401) if email not found.
     * Throws BadCredentialsException (mapped to 401) if password is wrong.
     */
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Bad password for user: {}", request.getEmail());
            throw new BadCredentialsException("Invalid credentials");
        }

        log.info("Login successful: {}", user.getEmail());
        return AuthResponse.fromUser(user, jwtUtil.generateToken(user));
    }
}
