package com.ecom.notificationservice.service;

import com.ecom.notificationservice.event.OrderPlacedEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendOrderConfirmation(OrderPlacedEvent event) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(event.getUserEmail());
            helper.setSubject("Order Confirmed! #" + event.getOrderId());
            helper.setText(buildOrderConfirmationBody(event), true);

            mailSender.send(message);
            log.info("Order confirmation email sent to {} for order {}", event.getUserEmail(), event.getOrderId());

        } catch (MessagingException e) {
            log.error("Failed to send order confirmation email for order {}: {}", event.getOrderId(), e.getMessage());
        }
    }

    public void sendOrderShipped(OrderPlacedEvent event) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(event.getUserEmail());
            helper.setSubject("Your order #" + event.getOrderId() + " has been shipped!");
            helper.setText(buildOrderShippedBody(event), true);

            mailSender.send(message);
            log.info("Order shipped email sent to {} for order {}", event.getUserEmail(), event.getOrderId());

        } catch (MessagingException e) {
            log.error("Failed to send order shipped email for order {}: {}", event.getOrderId(), e.getMessage());
        }
    }

    private String buildOrderConfirmationBody(OrderPlacedEvent event) {
        StringBuilder items = new StringBuilder();
        for (OrderPlacedEvent.OrderItemInfo item : event.getItems()) {
            items.append(String.format(
                "<tr><td style='padding:8px;border-bottom:1px solid #eee'>%s</td>" +
                "<td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>%d</td>" +
                "<td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>₹%.2f</td></tr>",
                item.getProductName(), item.getQuantity(), item.getUnitPrice()
            ));
        }

        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>" +
            "<h2 style='color:#2ecc71'>Order Confirmed!</h2>" +
            "<p>Hi <strong>" + event.getUserName() + "</strong>,</p>" +
            "<p>Thank you for your order. We've received it and it's being processed.</p>" +
            "<table style='width:100%;border-collapse:collapse;margin:20px 0'>" +
            "<tr style='background:#f8f8f8'>" +
            "<th style='padding:10px;text-align:left'>Product</th>" +
            "<th style='padding:10px;text-align:center'>Qty</th>" +
            "<th style='padding:10px;text-align:right'>Unit Price</th>" +
            "</tr>" +
            items +
            "</table>" +
            "<p style='font-size:18px'>Order Total: <strong>₹" + event.getTotalAmount() + "</strong></p>" +
            "<p style='color:#888;font-size:13px'>Order ID: #" + event.getOrderId() + "</p>" +
            "<p>Your order is being processed and we'll notify you once it ships.</p>" +
            "<p>Thank you for shopping with us!</p>" +
            "</div>";
    }

    private String buildOrderShippedBody(OrderPlacedEvent event) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>" +
            "<h2 style='color:#3498db'>Your Order is On the Way!</h2>" +
            "<p>Hi <strong>" + event.getUserName() + "</strong>,</p>" +
            "<p>Great news! Your order <strong>#" + event.getOrderId() + "</strong> has been shipped.</p>" +
            "<p>Your package is on its way and will be delivered soon.</p>" +
            "<p style='color:#888;font-size:13px'>Order Total: ₹" + event.getTotalAmount() + "</p>" +
            "<p>Thank you for shopping with us!</p>" +
            "</div>";
    }
}
