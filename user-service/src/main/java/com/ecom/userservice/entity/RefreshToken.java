package com.ecom.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;

// Stored in DB so we can revoke sessions, enforce one-active-session-per-user,
// and detect token reuse attacks. Unlike JWTs (which are stateless and self-validating),
// refresh tokens MUST be in the database — the DB is the source of truth for validity.
@Entity
@Table(name = "refresh_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    // Instant (not LocalDateTime) because token expiry compares against Instant.now()
    // which is timezone-independent. LocalDateTime without a timezone can give wrong
    // results in production servers running in non-UTC zones.
    @Column(nullable = false)
    private Instant expiryDate;

    // Allows server-side revocation without waiting for natural expiry.
    // Useful for forced logouts (password change, suspicious activity, admin action).
    @Builder.Default
    @Column(nullable = false)
    private boolean revoked = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
