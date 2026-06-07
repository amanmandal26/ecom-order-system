package com.ecom.userservice.repository;

import com.ecom.userservice.entity.RefreshToken;
import com.ecom.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    List<RefreshToken> findByUser(User user);

    // Derived delete methods use "select-then-delete" — no @Modifying needed.
    // @Transactional ensures they run in a transaction even from non-tx callers.
    @Transactional
    void deleteByUser(User user);

    @Transactional
    void deleteByToken(String token);
}
