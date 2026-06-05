package com.ecom.orderservice.event;

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

    // Set only on seller-initiated shipped events — identifies who shipped the order.
    // Null for order-placed events and admin-initiated status changes.
    private String sellerName;

    // One entry per order line item — only populated for seller-owned products.
    // Admin-created products (no sellerEmail) produce no entry here.
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
