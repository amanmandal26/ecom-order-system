package com.ecom.monolith.repository;

import com.ecom.monolith.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * UserRepository provides data access operations for the User entity.
 * Extends JpaRepository to inherit standard CRUD operations.
 *
 * Why this matters:
 * - Abstracts database interaction, decouples business logic from persistence
 * - findByEmail() enables fast user lookup during login/registration
 * - Spring Data JPA auto-generates implementation at runtime
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by email address.
     * Email is unique, so returns Optional<User> (0 or 1 result).
     *
     * @param email the user's email
     * @return Optional containing the user if found, empty otherwise
     */
    Optional<User> findByEmail(String email);
}
