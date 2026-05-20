package com.ecom.monolith.dto;

import com.ecom.monolith.entity.Order;
import com.ecom.monolith.entity.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {

    private Long id;
    private Long userId;
    private String userEmail;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private List<OrderItemResponse> items;
    private LocalDateTime createdAt;

    // Called inside a @Transactional service method, so lazy collections (user, orderItems)
    // are still within an open Hibernate session and can be accessed safely.
    public static OrderResponse fromOrder(Order order) {
        return OrderResponse.builder()
            .id(order.getId())
            .userId(order.getUser().getId())
            .userEmail(order.getUser().getEmail())
            .status(order.getStatus())
            .totalAmount(order.getTotalAmount())
            .items(order.getOrderItems().stream()
                .map(OrderItemResponse::fromOrderItem)
                .toList())
            .createdAt(order.getCreatedAt())
            .build();
    }
}
