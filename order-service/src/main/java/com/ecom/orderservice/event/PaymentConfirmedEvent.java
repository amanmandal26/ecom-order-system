package com.ecom.orderservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentConfirmedEvent {
    private Long orderId;
    private String userEmail;
    private BigDecimal totalAmount;
    private String razorpayPaymentId;
}
