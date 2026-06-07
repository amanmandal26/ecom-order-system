package com.ecom.userservice.service;

import com.ecom.userservice.config.JwtProperties;
import com.ecom.userservice.entity.RefreshToken;
import com.ecom.userservice.entity.User;
import com.ecom.userservice.exception.ResourceNotFoundException;
import com.ecom.userservice.exception.TokenException;
import com.ecom.userservice.repository.RefreshTokenRepository;
import com.ecom.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtProperties jwtProperties;

    // Creates a new refresh token for the user, deleting any existing ones first.
    // One-active-session rule: a user can only be logged in from one place at a time.
    // If you want multi-device support, remove the deleteByUser call.
    public RefreshToken createRefreshToken(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshToken = RefreshToken.builder()
            .user(user)
            .token(UUID.randomUUID().toString())
            .expiryDate(Instant.now().plusMillis(jwtProperties.getRefreshExpiration()))
            .build();

        log.info("Created refresh token for user {}", user.getEmail());
        return refreshTokenRepository.save(refreshToken);
    }

    // Validates that a token exists, is not revoked, and is not expired.
    // Deletes expired tokens from the DB to keep the table clean.
    public RefreshToken validateRefreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
            .orElseThrow(() -> new TokenException("Invalid refresh token"));

        if (refreshToken.isRevoked()) {
            throw new TokenException("Refresh token has been revoked. Please login again.");
        }

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.deleteByToken(token);
            log.info("Deleted expired refresh token for user {}", refreshToken.getUser().getEmail());
            throw new TokenException("Refresh token has expired. Please login again.");
        }

        return refreshToken;
    }

    // Token rotation: every use of a refresh token issues a brand-new one and
    // invalidates the old one. This means a stolen token can only be used ONCE
    // before the legitimate user's next request detects the mismatch and forces re-login.
    public RefreshToken rotateRefreshToken(String oldToken) {
        RefreshToken old = validateRefreshToken(oldToken);
        User user = old.getUser();

        refreshTokenRepository.deleteByToken(oldToken);

        RefreshToken newToken = RefreshToken.builder()
            .user(user)
            .token(UUID.randomUUID().toString())
            .expiryDate(Instant.now().plusMillis(jwtProperties.getRefreshExpiration()))
            .build();

        log.info("Rotated refresh token for user {}", user.getEmail());
        return refreshTokenRepository.save(newToken);
    }

    public void deleteByToken(String token) {
        refreshTokenRepository.deleteByToken(token);
    }
}
