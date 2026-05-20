package com.ecom.monolith.dto;

import com.ecom.monolith.entity.OrderItem;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OrderItemResponse {

    private Long id;
    private Long productId;
    private String productName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal; // unitPrice * quantity — computed at mapping time, not stored in DB

    public static OrderItemResponse fromOrderItem(OrderItem item) {
        return OrderItemResponse.builder()
            .id(item.getId())
            .productId(item.getProduct().getId())
            .productName(item.getProduct().getName())
            .quantity(item.getQuantity())
            .unitPrice(item.getUnitPrice())
            .subtotal(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .build();
    }
}
