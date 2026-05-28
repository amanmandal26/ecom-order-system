package com.ecom.orderservice.repository;

import com.ecom.orderservice.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Order> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    Page<Order> findByUserEmailOrderByCreatedAtDesc(String userEmail, Pageable pageable);
}
