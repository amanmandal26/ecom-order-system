package com.ecom.productservice.dto;

import com.ecom.productservice.entity.Product;
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
    private Long   sellerId;
    private String sellerName;
    private String sellerEmail;
    private LocalDateTime createdAt;

    public static ProductResponse fromProduct(Product product) {
        return ProductResponse.builder()
            .id(product.getId())
            .name(product.getName())
            .description(product.getDescription())
            .price(product.getPrice())
            .stockQuantity(product.getStockQuantity())
            .sellerId(product.getSellerId())
            .sellerName(product.getSellerName())
            .sellerEmail(product.getSellerEmail())
            .createdAt(product.getCreatedAt())
            .build();
    }
}
