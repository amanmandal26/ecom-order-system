package com.ecom.userservice.service;

import com.ecom.userservice.dto.AuthResponse;
import com.ecom.userservice.dto.LoginRequest;
import com.ecom.userservice.dto.ResetPasswordRequest;
import com.ecom.userservice.dto.SellerRegistrationRequest;
import com.ecom.userservice.entity.PasswordResetToken;
import com.ecom.userservice.entity.RefreshToken;
import com.ecom.userservice.entity.User;
import com.ecom.userservice.exception.BadRequestException;
import com.ecom.userservice.exception.UserAlreadyExistsException;
import com.ecom.userservice.repository.PasswordResetTokenRepository;
import com.ecom.userservice.repository.UserRepository;
import com.ecom.userservice.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService.
 *
 * WHY we mock JavaMailSender:
 * The real JavaMailSender would try to open a TCP connection to an SMTP server.
 * The mock silently does nothing when send() is called — no network, no config needed.
 * Mockito void-method mocks DO NOTHING by default, which is exactly what we want.
 *
 * WHY we mock PasswordEncoder:
 * BCrypt is intentionally slow (~100ms per encode) to resist brute-force attacks.
 * In tests we don't need that security — we just need to know encode() was called
 * and that the encoded value is stored. Mocking returns instantly.
 *
 * IMPORTANT: The UserService.sendEmail() helper wraps mailSender.send() in a try/catch
 * and rethrows as RuntimeException on failure. Since our mock does nothing (no exception),
 * the service flow continues normally through all email-sending paths. ✓
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @InjectMocks
    private UserService userService;

    // Shared test user — rebuilt fresh before each test
    private User customerUser;

    @BeforeEach
    void setUp() {
        customerUser = User.builder()
            .id(1L)
            .name("Test User")
            .email("test@test.com")
            .password("encoded-password")
            .role(User.Role.CUSTOMER)
            .build();
    }

    // ─── login ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("login: correct credentials → returns access token, refresh token, and role")
    void login_withCorrectCredentials_shouldReturnTokens() {
        // Arrange
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(customerUser));
        // passwordEncoder.matches(rawPassword, storedHash) → true means password is correct
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);
        when(jwtUtil.generateToken(customerUser)).thenReturn("fake-jwt-token");

        RefreshToken refreshToken = RefreshToken.builder()
            .id(1L)
            .token("fake-refresh-token")
            .user(customerUser)
            .expiryDate(Instant.now().plusSeconds(86400 * 30)) // 30 days
            .build();
        when(refreshTokenService.createRefreshToken(1L)).thenReturn(refreshToken);

        LoginRequest request = LoginRequest.builder()
            .email("test@test.com")
            .password("password123")
            .build();

        // Act
        AuthResponse response = userService.login(request);

        // Assert
        assertEquals("fake-jwt-token", response.getToken());
        assertEquals("fake-refresh-token", response.getRefreshToken());
        assertEquals("CUSTOMER", response.getRole());
        assertEquals("test@test.com", response.getEmail());
    }

    @Test
    @DisplayName("login: wrong password → throws BadCredentialsException")
    void login_withWrongPassword_shouldThrowException() {
        // Arrange — user found but password doesn't match
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(customerUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        LoginRequest request = LoginRequest.builder()
            .email("test@test.com")
            .password("wrong-password")
            .build();

        // Act + Assert
        assertThrows(
            BadCredentialsException.class,
            () -> userService.login(request)
        );

        // No tokens should be issued for a bad password
        verifyNoInteractions(jwtUtil, refreshTokenService);
    }

    @Test
    @DisplayName("login: email not registered → throws UsernameNotFoundException")
    void login_withNonExistentEmail_shouldThrowException() {
        // Arrange — no user in DB for this email
        when(userRepository.findByEmail("ghost@test.com")).thenReturn(Optional.empty());

        LoginRequest request = LoginRequest.builder()
            .email("ghost@test.com")
            .password("anypassword")
            .build();

        // Act + Assert
        assertThrows(
            UsernameNotFoundException.class,
            () -> userService.login(request)
        );
    }

    // ─── registerAsSeller ──────────────────────────────────────────────────────

    @Test
    @DisplayName("registerAsSeller: new email → creates PENDING seller and notifies admin by email")
    void registerAsSeller_withNewEmail_shouldCreatePendingSeller() {
        // Arrange — email is not taken
        when(userRepository.findByEmail("rajesh@seller.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");

        // mailSender.send() is a void method — Mockito does nothing by default.
        // This simulates a successful email send without touching any SMTP server.
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        SellerRegistrationRequest request = new SellerRegistrationRequest();
        request.setEmail("rajesh@seller.com");
        request.setPassword("password123");
        request.setName("Rajesh Kumar");
        request.setBusinessName("Rajesh Electronics");
        request.setBusinessDescription("Electronics store");

        // Act
        String result = userService.registerAsSeller(request);

        // Assert
        assertTrue(result.contains("Awaiting admin approval"),
            "Response should confirm the seller is pending approval");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("registerAsSeller: email already taken → throws UserAlreadyExistsException")
    void registerAsSeller_withExistingEmail_shouldThrowException() {
        // Arrange — email already registered (could be customer or another seller)
        when(userRepository.findByEmail("rajesh@seller.com")).thenReturn(Optional.of(customerUser));

        SellerRegistrationRequest request = new SellerRegistrationRequest();
        request.setEmail("rajesh@seller.com");
        request.setPassword("password123");
        request.setName("Rajesh Kumar");
        request.setBusinessName("Rajesh Electronics");

        // Act + Assert
        UserAlreadyExistsException ex = assertThrows(
            UserAlreadyExistsException.class,
            () -> userService.registerAsSeller(request)
        );

        assertTrue(ex.getMessage().contains("rajesh@seller.com"));
        // No save should happen — duplicate email must be rejected before persisting
        verify(userRepository, never()).save(any(User.class));
    }

    // ─── resetPassword ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("resetPassword: valid token + matching passwords → updates password, marks token used")
    void resetPassword_withValidToken_shouldUpdatePassword() {
        // Arrange — token exists, is unused, and hasn't expired
        PasswordResetToken resetToken = PasswordResetToken.builder()
            .id(1L)
            .token("valid-token")
            .user(customerUser)
            .expiryTime(LocalDateTime.now().plusHours(1)) // expires 1 hour from now
            .used(false)
            .build();

        when(passwordResetTokenRepository.findByToken("valid-token"))
            .thenReturn(Optional.of(resetToken));
        when(passwordEncoder.encode("newPassword123")).thenReturn("new-encoded-password");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("newPassword123");
        request.setConfirmPassword("newPassword123");

        // Act
        userService.resetPassword(request);

        // Assert — user's password must have been saved and token marked as used
        verify(userRepository, times(1)).save(customerUser);
        // The service mutates the resetToken object directly before saving
        assertTrue(resetToken.isUsed(), "Token must be marked as used after a successful reset");
        verify(passwordResetTokenRepository, times(1)).save(resetToken);
    }

    @Test
    @DisplayName("resetPassword: expired token → throws BadRequestException with expiry message")
    void resetPassword_withExpiredToken_shouldThrowException() {
        // Arrange — token exists and is unused, but expired 1 hour ago
        PasswordResetToken expiredToken = PasswordResetToken.builder()
            .id(1L)
            .token("expired-token")
            .user(customerUser)
            .expiryTime(LocalDateTime.now().minusHours(1)) // expired in the past
            .used(false) // must be unused so the expiry check is reached
            .build();

        when(passwordResetTokenRepository.findByToken("expired-token"))
            .thenReturn(Optional.of(expiredToken));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("expired-token");
        request.setNewPassword("newPassword123");
        request.setConfirmPassword("newPassword123");

        // Act + Assert
        BadRequestException ex = assertThrows(
            BadRequestException.class,
            () -> userService.resetPassword(request)
        );

        assertTrue(ex.getMessage().contains("Reset link has expired"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("resetPassword: already used token → throws BadRequestException with used message")
    void resetPassword_withUsedToken_shouldThrowException() {
        // Arrange — token has already been consumed
        PasswordResetToken usedToken = PasswordResetToken.builder()
            .id(1L)
            .token("used-token")
            .user(customerUser)
            .expiryTime(LocalDateTime.now().plusHours(1))
            .used(true) // already used
            .build();

        when(passwordResetTokenRepository.findByToken("used-token"))
            .thenReturn(Optional.of(usedToken));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("used-token");
        request.setNewPassword("newPassword123");
        request.setConfirmPassword("newPassword123");

        // Act + Assert
        BadRequestException ex = assertThrows(
            BadRequestException.class,
            () -> userService.resetPassword(request)
        );

        // Exact message from UserService: "This reset link has already been used"
        assertTrue(ex.getMessage().contains("already been used"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("resetPassword: mismatched passwords → throws BadRequestException")
    void resetPassword_withMismatchedPasswords_shouldThrowException() {
        // Arrange — valid, unused, non-expired token
        PasswordResetToken resetToken = PasswordResetToken.builder()
            .id(1L)
            .token("valid-token")
            .user(customerUser)
            .expiryTime(LocalDateTime.now().plusHours(1))
            .used(false)
            .build();

        when(passwordResetTokenRepository.findByToken("valid-token"))
            .thenReturn(Optional.of(resetToken));

        // newPassword and confirmPassword do NOT match
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("abc123");
        request.setConfirmPassword("xyz789");

        // Act + Assert
        BadRequestException ex = assertThrows(
            BadRequestException.class,
            () -> userService.resetPassword(request)
        );

        assertEquals("Passwords do not match", ex.getMessage());
        // Password must not be changed when confirmation fails
        verify(userRepository, never()).save(any(User.class));
    }
}
