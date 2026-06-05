package com.ecom.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPlacedEvent {

    private Long orderId;
    private String userEmail;
    private String userName;
    private BigDecimal totalAmount;
    private List<OrderItemInfo> items;

    // Must mirror order-service's OrderPlacedEvent exactly — same field names,
    // same types — so Jackson deserialises the RabbitMQ JSON payload correctly.
    // sellerName is set only on seller-shipped events; null for order-placed events.
    private String sellerName;

    @Builder.Default
    private List<SellerNotification> sellerNotifications = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemInfo {
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellerNotification {
        private String sellerEmail;
        private String sellerName;
        private String productName;
        private Integer quantityOrdered;
        private BigDecimal unitPrice;
        private String customerEmail;
        private Integer remainingStock;
    }
}
