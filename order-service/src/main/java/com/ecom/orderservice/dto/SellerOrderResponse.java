package com.ecom.orderservice.dto;

import com.ecom.orderservice.entity.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// One row per order item belonging to this seller — a seller sees each of their
// products as a separate row even if they appear in the same customer order.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellerOrderResponse {

    private Long orderId;
    private LocalDateTime orderDate;
    private String customerEmail;
    private OrderStatus status;
    private BigDecimal totalAmount;

    // Item-level details for this seller's specific product
    private Long productId;
    private String productName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;

    private String sellerEmail;
    private String sellerName;
}
