package com.ecom.orderservice.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentOrderRequest {
    private Long orderId;
    private BigDecimal amount;
}
