package com.ecom.monolith.repository;

import com.ecom.monolith.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Spring Data generates: SELECT * FROM orders WHERE user_id = ?
    List<Order> findByUserId(Long userId);

    // Spring Data generates: SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
}
