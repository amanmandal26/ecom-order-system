package com.ecom.orderservice.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// Mirror of product-service's ProductResponse — only the fields order-service actually needs.
// Feign deserialises the JSON response into this class; extra fields are silently ignored.
@Data
@NoArgsConstructor
public class ProductResponse {

    private Long id;
    private String name;
    private BigDecimal price;
    private Integer stockQuantity;
}
