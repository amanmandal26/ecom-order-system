package com.ecom.monolith.dto;

import com.ecom.monolith.entity.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stockQuantity;
    private LocalDateTime createdAt;

    // Factory method — same pattern as AuthResponse.fromUser().
    // Keeps mapping logic here in the DTO, not scattered in the service.
    public static ProductResponse fromProduct(Product product) {
        return ProductResponse.builder()
            .id(product.getId())
            .name(product.getName())
            .description(product.getDescription())
            .price(product.getPrice())
            .stockQuantity(product.getStockQuantity())
            .createdAt(product.getCreatedAt())
            .build();
    }
}
