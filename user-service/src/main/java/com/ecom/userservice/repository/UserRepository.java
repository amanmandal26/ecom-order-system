package com.ecom.userservice.repository;

import com.ecom.userservice.entity.SellerStatus;
import com.ecom.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByRole(User.Role role);

    List<User> findByRoleAndSellerStatus(User.Role role, SellerStatus sellerStatus);
}
