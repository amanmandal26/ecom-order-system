package com.ecom.userservice.service;

import com.ecom.userservice.dto.AuthResponse;
import com.ecom.userservice.dto.ForgotPasswordRequest;
import com.ecom.userservice.dto.LoginRequest;
import com.ecom.userservice.dto.RegisterRequest;
import com.ecom.userservice.dto.ResetPasswordRequest;
import com.ecom.userservice.dto.SellerApprovalRequest;
import com.ecom.userservice.dto.SellerRegistrationRequest;
import com.ecom.userservice.dto.SellerResponse;
import com.ecom.userservice.dto.TokenRefreshResponse;
import com.ecom.userservice.entity.PasswordResetToken;
import com.ecom.userservice.entity.RefreshToken;
import com.ecom.userservice.entity.SellerStatus;
import com.ecom.userservice.entity.User;
import com.ecom.userservice.exception.BadRequestException;
import com.ecom.userservice.exception.ResourceNotFoundException;
import com.ecom.userservice.exception.UserAlreadyExistsException;
import com.ecom.userservice.repository.PasswordResetTokenRepository;
import com.ecom.userservice.repository.UserRepository;
import com.ecom.userservice.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JavaMailSender mailSender;
    private final RefreshTokenService refreshTokenService;

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

        // Access token: short-lived JWT (15 min), validated stateless by every service.
        // Refresh token: long-lived UUID stored in DB (30 days), used only to get new access tokens.
        String accessToken = jwtUtil.generateToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        log.info("Login successful: {}", user.getEmail());
        return AuthResponse.fromUser(user, accessToken, refreshToken.getToken());
    }

    // Called by POST /api/auth/refresh.
    // Validates the refresh token, rotates it (issues a new one, deletes the old),
    // and generates a fresh 15-minute access token. Token rotation means each
    // refresh token can only be used ONCE — reuse by an attacker is detected immediately.
    public TokenRefreshResponse refreshAccessToken(String rawRefreshToken) {
        RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(rawRefreshToken);
        User user = newRefreshToken.getUser();
        String newAccessToken = jwtUtil.generateToken(user);

        log.info("Access token refreshed for user {}", user.getEmail());
        return TokenRefreshResponse.builder()
            .accessToken(newAccessToken)
            .refreshToken(newRefreshToken.getToken())
            .build();
    }

    // Called by POST /api/auth/logout.
    // Deletes the refresh token from DB so it can never be used again.
    // The access token will naturally expire in 15 minutes.
    public void logout(String rawRefreshToken) {
        refreshTokenService.deleteByToken(rawRefreshToken);
        log.info("Refresh token deleted (logout)");
    }

    // Security note: we return the same message whether the email exists or not,
    // so attackers cannot use this endpoint to enumerate registered emails.
    public String forgotPassword(ForgotPasswordRequest request) {
        log.info("Forgot password request for: {}", request.getEmail());

        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            log.info("User found: {}, sending reset email", user.getEmail());

            String token = UUID.randomUUID().toString();

            PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryTime(LocalDateTime.now().plusMinutes(15))
                .build();

            passwordResetTokenRepository.save(resetToken);
            log.info("Password reset token created for user: {}", user.getEmail());

            sendResetEmail(user.getEmail(), token);
        });

        return "If this email exists, a reset link has been sent";
    }

    public String resetPassword(ResetPasswordRequest request) {
        log.info("Reset password attempt with token: {}", request.getToken());

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
            .orElseThrow(() -> new BadRequestException("Invalid or expired reset link"));

        if (resetToken.isUsed()) {
            throw new BadRequestException("This reset link has already been used");
        }

        if (resetToken.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset link has expired");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        log.info("Password reset successfully for user: {}", user.getEmail());
        return "Password reset successfully";
    }

    // ──────────────────────────────────────────────
    // Seller flows
    // ──────────────────────────────────────────────

    public String registerAsSeller(SellerRegistrationRequest request) {
        log.info("Seller registration request: {}", request.getEmail());

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        User seller = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.SELLER)
                .businessName(request.getBusinessName())
                .businessDescription(request.getBusinessDescription())
                .sellerStatus(SellerStatus.PENDING)
                .sellerRequestedAt(LocalDateTime.now())
                .build();

        userRepository.save(seller);
        log.info("Seller saved with PENDING status: {}", seller.getEmail());

        sendEmail(
            "gateway@test.com",
            "New Seller Registration Request",
            "Seller Name: " + request.getName() + ", Business: " + request.getBusinessName() +
            " has requested to join EcomShop as a seller.\n" +
            "Login to admin panel to approve or reject."
        );

        return "Seller registration submitted. Awaiting admin approval.";
    }

    public SellerResponse approveSeller(SellerApprovalRequest request) {
        log.info("Admin action on seller id={}: {}", request.getSellerId(), request.getStatus());

        User seller = userRepository.findById(request.getSellerId())
                .orElseThrow(() -> new ResourceNotFoundException("Seller", request.getSellerId()));

        if (request.getStatus() == SellerStatus.APPROVED) {
            seller.setSellerStatus(SellerStatus.APPROVED);
            seller.setSellerApprovedAt(LocalDateTime.now());
            sendEmail(
                seller.getEmail(),
                "Your EcomShop Seller Account is Approved!",
                "Congratulations! Your seller account has been approved. " +
                "You can now login and start adding products."
            );
        } else if (request.getStatus() == SellerStatus.REJECTED) {
            seller.setSellerStatus(SellerStatus.REJECTED);
            String reason = request.getReason() != null ? request.getReason() : "No reason provided";
            sendEmail(
                seller.getEmail(),
                "Your EcomShop Seller Application Status",
                "Your seller application has been rejected. Reason: " + reason
            );
        } else {
            throw new BadRequestException("Status must be APPROVED or REJECTED");
        }

        userRepository.save(seller);
        log.info("Seller {} updated to {}", seller.getEmail(), seller.getSellerStatus());
        return SellerResponse.fromUser(seller);
    }

    @Transactional(readOnly = true)
    public List<SellerResponse> getPendingSellers() {
        return userRepository.findByRoleAndSellerStatus(User.Role.SELLER, SellerStatus.PENDING)
                .stream()
                .map(SellerResponse::fromUser)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SellerResponse> getAllSellers() {
        return userRepository.findByRole(User.Role.SELLER)
                .stream()
                .map(SellerResponse::fromUser)
                .toList();
    }

    // ──────────────────────────────────────────────
    // Email helpers
    // ──────────────────────────────────────────────

    private void sendEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
            log.info("Email sent to {}: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    private void sendResetEmail(String toEmail, String token) {
        String resetLink = "http://localhost:3000/reset-password?token=" + token;
        sendEmail(
            toEmail,
            "Reset Your EcomShop Password",
            "Click the link below to reset your password.\n\n" +
            "This link expires in 15 minutes.\n\n" +
            resetLink + "\n\n" +
            "If you did not request this, ignore this email."
        );
    }
}
