package com.ecom.orderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Matches product-service's StockRequest exactly — Feign serialises this as the request body.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockRequest {

    private Integer quantity;
}
