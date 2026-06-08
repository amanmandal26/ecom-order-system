package com.ecom.orderservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentOrderResponse {
    private String razorpayOrderId;
    private Long amount;       // in paise
    private String currency;
    private String keyId;      // frontend needs this to open the Razorpay popup
    private Long appOrderId;
}
