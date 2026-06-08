package com.ecom.orderservice.service;

import com.ecom.orderservice.config.RabbitMQConfig;
import com.ecom.orderservice.dto.PaymentOrderResponse;
import com.ecom.orderservice.dto.PaymentVerificationRequest;
import com.ecom.orderservice.entity.Order;
import com.ecom.orderservice.entity.OrderStatus;
import com.ecom.orderservice.event.PaymentConfirmedEvent;
import com.ecom.orderservice.exception.BadRequestException;
import com.ecom.orderservice.exception.ResourceNotFoundException;
import com.ecom.orderservice.repository.OrderRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentService {

    private final OrderRepository orderRepository;
    private final RazorpayClient razorpayClient;
    private final AmqpTemplate rabbitTemplate;

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    public PaymentOrderResponse createPaymentOrder(Long appOrderId) {
        Order order = orderRepository.findById(appOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", appOrderId));

        // Razorpay requires the amount in paise (1 rupee = 100 paise).
        // e.g. ₹799.99 → 79999 paise. We multiply by 100 and take the long value.
        long amountInPaise = order.getTotalAmount()
                .multiply(java.math.BigDecimal.valueOf(100))
                .longValue();

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "order_" + appOrderId);
            // payment_capture: 1 means auto-capture — Razorpay captures the payment
            // immediately on success without a separate capture API call from our server.
            orderRequest.put("payment_capture", 1);

            com.razorpay.Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            log.info("Created Razorpay order {} for app order {}", razorpayOrder.get("id"), appOrderId);

            return PaymentOrderResponse.builder()
                    .razorpayOrderId(razorpayOrder.get("id"))
                    .amount(amountInPaise)
                    .currency("INR")
                    .keyId(keyId)
                    .appOrderId(appOrderId)
                    .build();

        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order for app order {}: {}", appOrderId, e.getMessage());
            throw new BadRequestException("Failed to initiate payment: " + e.getMessage());
        }
    }

    public String verifyPayment(PaymentVerificationRequest request) {
        // Razorpay sends a signature = HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, keySecret).
        // We recompute it on the backend and compare — if they match, the payment is genuine.
        // This MUST happen on the backend: the keySecret is never sent to the browser,
        // so a malicious client cannot forge a valid signature.
        String payload = request.getRazorpayOrderId() + "|" + request.getRazorpayPaymentId();
        String expectedSignature = generateHmacSHA256(payload, keySecret);

        if (!expectedSignature.equals(request.getRazorpaySignature())) {
            log.warn("Payment verification failed for app order {} — signature mismatch", request.getAppOrderId());
            throw new BadRequestException("Payment verification failed — invalid signature");
        }

        Order order = orderRepository.findById(request.getAppOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", request.getAppOrderId()));

        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
        log.info("Order {} confirmed after successful Razorpay payment {}", order.getId(), request.getRazorpayPaymentId());

        PaymentConfirmedEvent event = PaymentConfirmedEvent.builder()
                .orderId(order.getId())
                .userEmail(order.getUserEmail())
                .totalAmount(order.getTotalAmount())
                .razorpayPaymentId(request.getRazorpayPaymentId())
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.KEY_CONFIRMED, event);
        log.info("Published order.confirmed event for order {}", order.getId());

        return "Payment successful! Order #" + order.getId() + " confirmed.";
    }

    private String generateHmacSHA256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC-SHA256 signature", e);
        }
    }
}
