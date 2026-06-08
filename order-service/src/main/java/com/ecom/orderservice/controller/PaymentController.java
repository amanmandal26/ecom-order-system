package com.ecom.orderservice.controller;

import com.ecom.orderservice.dto.ApiResponse;
import com.ecom.orderservice.dto.PaymentOrderRequest;
import com.ecom.orderservice.dto.PaymentOrderResponse;
import com.ecom.orderservice.dto.PaymentVerificationRequest;
import com.ecom.orderservice.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payments", description = "Razorpay payment integration — CUSTOMER only")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Create Razorpay order", description = "Creates a Razorpay order for an existing app order. Returns the Razorpay order ID and key needed to open the checkout popup.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<PaymentOrderResponse>> createOrder(
            @RequestBody PaymentOrderRequest request) {
        log.info("Creating Razorpay order for app order {}", request.getOrderId());
        PaymentOrderResponse response = paymentService.createPaymentOrder(request.getOrderId());
        return ResponseEntity.ok(ApiResponse.ok("Payment order created", response));
    }

    @Operation(summary = "Verify payment", description = "Verifies Razorpay HMAC-SHA256 signature and confirms the order on success.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<String>> verifyPayment(
            @RequestBody PaymentVerificationRequest request) {
        log.info("Verifying payment for app order {}", request.getAppOrderId());
        String message = paymentService.verifyPayment(request);
        return ResponseEntity.ok(ApiResponse.ok(message, null));
    }
}
