package com.ecom.orderservice.repository;

import com.ecom.orderservice.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Order> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    Page<Order> findByUserEmailOrderByCreatedAtDesc(String userEmail, Pageable pageable);

    // We query through order_items (not directly on orders) because the seller
    // relationship lives at the item level — one order can contain products from
    // multiple sellers. DISTINCT prevents the same order appearing twice when it
    // has multiple items from the same seller.
    // countQuery is required when the main query uses JOIN + DISTINCT so Spring
    // Data can compute total pages without loading all rows.
    @Query(value = "SELECT DISTINCT o FROM Order o JOIN o.orderItems oi WHERE oi.sellerEmail = :sellerEmail",
           countQuery = "SELECT COUNT(DISTINCT o) FROM Order o JOIN o.orderItems oi WHERE oi.sellerEmail = :sellerEmail")
    Page<Order> findOrdersBySellerEmail(@Param("sellerEmail") String sellerEmail, Pageable pageable);
}
