package com.ecom.userservice.service;

import com.ecom.userservice.dto.AuthResponse;
import com.ecom.userservice.dto.LoginRequest;
import com.ecom.userservice.dto.RegisterRequest;
import com.ecom.userservice.entity.User;
import com.ecom.userservice.exception.UserAlreadyExistsException;
import com.ecom.userservice.repository.UserRepository;
import com.ecom.userservice.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> {
                log.warn("User not found: {}", email);
                return new UsernameNotFoundException("User not found: " + email);
            });
    }

    public AuthResponse register(RegisterRequest request) {
        log.info("Registering user: {}", request.getEmail());

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .build();

        user = userRepository.save(user);
        log.info("User registered with id: {}", user.getId());

        return AuthResponse.fromUser(user, jwtUtil.generateToken(user));
    }

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
