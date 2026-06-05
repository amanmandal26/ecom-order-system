package com.ecom.notificationservice.service;

import com.ecom.notificationservice.event.OrderPlacedEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

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

    public void sendSellerOrderNotification(OrderPlacedEvent.SellerNotification sn) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(sn.getSellerEmail());
            helper.setSubject("New Order Received for your product!");
            helper.setText(buildSellerOrderBody(sn), true);

            mailSender.send(message);
            log.info("Seller order notification sent to {} for product '{}'",
                sn.getSellerEmail(), sn.getProductName());

        } catch (MessagingException e) {
            log.error("Failed to send seller order notification to {}: {}", sn.getSellerEmail(), e.getMessage());
        }
    }

    public void sendLowStockAlert(OrderPlacedEvent.SellerNotification sn) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(sn.getSellerEmail());
            helper.setSubject("⚠️ Low Stock Alert: " + sn.getProductName());
            helper.setText(buildLowStockBody(sn), true);

            mailSender.send(message);
            log.info("Low stock alert sent to {} — '{}' has {} units remaining",
                sn.getSellerEmail(), sn.getProductName(), sn.getRemainingStock());

        } catch (MessagingException e) {
            log.error("Failed to send low stock alert to {}: {}", sn.getSellerEmail(), e.getMessage());
        }
    }

    private String buildSellerOrderBody(OrderPlacedEvent.SellerNotification sn) {
        BigDecimal total = sn.getUnitPrice().multiply(BigDecimal.valueOf(sn.getQuantityOrdered()));
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>" +
            "<h2 style='color:#2ecc71'>New Order Received!</h2>" +
            "<p>Hello <strong>" + sn.getSellerName() + "</strong>,</p>" +
            "<p>Great news! A customer has ordered your product.</p>" +
            "<table style='width:100%;border-collapse:collapse;margin:20px 0;background:#f8f9fa'>" +
            "<tr><td style='padding:10px;border-bottom:1px solid #e9ecef'><strong>Product</strong></td>" +
            "<td style='padding:10px;border-bottom:1px solid #e9ecef'>" + sn.getProductName() + "</td></tr>" +
            "<tr><td style='padding:10px;border-bottom:1px solid #e9ecef'><strong>Quantity Ordered</strong></td>" +
            "<td style='padding:10px;border-bottom:1px solid #e9ecef'>" + sn.getQuantityOrdered() + " units</td></tr>" +
            "<tr><td style='padding:10px;border-bottom:1px solid #e9ecef'><strong>Price per Unit</strong></td>" +
            "<td style='padding:10px;border-bottom:1px solid #e9ecef'>₹" + sn.getUnitPrice() + "</td></tr>" +
            "<tr><td style='padding:10px;border-bottom:1px solid #e9ecef'><strong>Total Earned</strong></td>" +
            "<td style='padding:10px;border-bottom:1px solid #e9ecef;color:#2ecc71'><strong>₹" + total + "</strong></td></tr>" +
            "<tr><td style='padding:10px;border-bottom:1px solid #e9ecef'><strong>Ordered by</strong></td>" +
            "<td style='padding:10px;border-bottom:1px solid #e9ecef'>" + sn.getCustomerEmail() + "</td></tr>" +
            "<tr><td style='padding:10px'><strong>Remaining Stock</strong></td>" +
            "<td style='padding:10px'>" + sn.getRemainingStock() + " units</td></tr>" +
            "</table>" +
            "<p>Please prepare the item for shipment.</p>" +
            "<p>Log in to your <strong>Seller Dashboard</strong> to update the order status.</p>" +
            "<p style='color:#888;font-size:13px'>- EcomShop Team</p>" +
            "</div>";
    }

    private String buildLowStockBody(OrderPlacedEvent.SellerNotification sn) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>" +
            "<h2 style='color:#e67e22'>⚠️ Low Stock Alert</h2>" +
            "<p>Hello <strong>" + sn.getSellerName() + "</strong>,</p>" +
            "<p>Your product <strong>'" + sn.getProductName() + "'</strong> is running low on stock.</p>" +
            "<div style='background:#fff3cd;border:1px solid #ffc107;padding:16px;border-radius:8px;margin:20px 0'>" +
            "<p style='margin:0;font-size:18px'>Current Stock: <strong style='color:#e67e22'>" +
            sn.getRemainingStock() + " units remaining</strong></p>" +
            "</div>" +
            "<p>Please restock soon to avoid missing orders.</p>" +
            "<p><strong>Login to Seller Dashboard → My Products → Restock</strong></p>" +
            "<p style='color:#888;font-size:13px'>- EcomShop Team</p>" +
            "</div>";
    }

    private String buildOrderShippedBody(OrderPlacedEvent event) {
        StringBuilder itemRows = new StringBuilder();
        if (event.getItems() != null) {
            for (OrderPlacedEvent.OrderItemInfo item : event.getItems()) {
                itemRows.append(String.format(
                    "<tr><td style='padding:8px;border-bottom:1px solid #eee'>%s</td>" +
                    "<td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>%d</td></tr>",
                    item.getProductName(), item.getQuantity()
                ));
            }
        }

        String shippedBy = (event.getSellerName() != null && !event.getSellerName().isBlank())
            ? event.getSellerName()
            : "EcomShop";

        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>" +
            "<h2 style='color:#3498db'>Your Order is On the Way! 🚚</h2>" +
            "<p>Hello <strong>" + event.getUserName() + "</strong>,</p>" +
            "<p>Great news! Your order <strong>#" + event.getOrderId() + "</strong> has been shipped.</p>" +
            "<table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8f9fa'>" +
            "<tr><td style='padding:10px;border-bottom:1px solid #e9ecef'><strong>Order ID</strong></td>" +
            "<td style='padding:10px;border-bottom:1px solid #e9ecef'>#" + event.getOrderId() + "</td></tr>" +
            "<tr><td style='padding:10px'><strong>Shipped by</strong></td>" +
            "<td style='padding:10px'>" + shippedBy + "</td></tr>" +
            "</table>" +
            "<h4 style='margin-bottom:6px'>Items Shipped:</h4>" +
            "<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>" +
            "<tr style='background:#f8f8f8'>" +
            "<th style='padding:8px;text-align:left'>Product</th>" +
            "<th style='padding:8px;text-align:center'>Qty</th>" +
            "</tr>" +
            itemRows +
            "</table>" +
            "<div style='background:#eff6ff;border-left:4px solid #3b82f6;padding:12px;border-radius:4px;margin-bottom:16px'>" +
            "<strong>Estimated Delivery:</strong> 3-5 business days" +
            "</div>" +
            "<p>Thank you for shopping with <strong>EcomShop</strong>!</p>" +
            "<p style='color:#888;font-size:13px'>Order Total: ₹" + event.getTotalAmount() + "</p>" +
            "</div>";
    }
}
