package com.ecom.monolith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // BigDecimal is mandatory for money — double/float can't represent decimal values exactly.
    // e.g. 0.1 + 0.2 = 0.30000000000000004 in floating point. BigDecimal avoids this.
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    // @Builder.Default: without this, Lombok's builder ignores the = 0 initializer and sets null,
    // which would violate the NOT NULL constraint on the products table.
    @Builder.Default
    @Column(nullable = false)
    private Integer stockQuantity = 0;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
