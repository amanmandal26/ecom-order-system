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
    // Seller fields populated from the first seller-owned item in the order.
    // Null when all items are admin-created products.
    private String sellerEmail;
    private String sellerName;
    private Long productId;

    public static OrderResponse fromOrder(Order order) {
        List<OrderItemResponse> itemResponses = order.getOrderItems().stream()
            .map(OrderItemResponse::fromOrderItem)
            .toList();

        // Pick the first item that has a seller to surface at order level
        OrderItemResponse firstSellerItem = itemResponses.stream()
            .filter(i -> i.getSellerEmail() != null && !i.getSellerEmail().isBlank())
            .findFirst()
            .orElse(null);

        return OrderResponse.builder()
            .id(order.getId())
            .userId(order.getUserId())
            .userEmail(order.getUserEmail())
            .status(order.getStatus())
            .totalAmount(order.getTotalAmount())
            .items(itemResponses)
            .createdAt(order.getCreatedAt())
            .sellerEmail(firstSellerItem != null ? firstSellerItem.getSellerEmail() : null)
            .sellerName(firstSellerItem != null ? firstSellerItem.getSellerName() : null)
            .productId(firstSellerItem != null ? firstSellerItem.getProductId() : null)
            .build();
    }
}
