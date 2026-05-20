package com.ecom.monolith.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Back-reference to the parent Order.
    // @ToString.Exclude / @EqualsAndHashCode.Exclude prevent infinite recursion
    // because Order.orderItems -> OrderItem.order -> Order.orderItems -> ...
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    // Price snapshot at the time the order was placed.
    // Decoupled from Product.price so historical orders survive price changes.
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;
}
