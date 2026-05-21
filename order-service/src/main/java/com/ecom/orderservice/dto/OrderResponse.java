package com.ecom.orderservice.dto;

import com.ecom.orderservice.entity.Order;
import com.ecom.orderservice.entity.OrderStatus;
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

    public static OrderResponse fromOrder(Order order) {
        return OrderResponse.builder()
            .id(order.getId())
            .userId(order.getUserId())
            .userEmail(order.getUserEmail())
            .status(order.getStatus())
            .totalAmount(order.getTotalAmount())
            .items(order.getOrderItems().stream()
                .map(OrderItemResponse::fromOrderItem)
                .toList())
            .createdAt(order.getCreatedAt())
            .build();
    }
}
