package com.ecom.notificationservice.listener;

import com.ecom.notificationservice.event.OrderPlacedEvent;
import com.ecom.notificationservice.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventListener {

    private final EmailService emailService;

    @RabbitListener(queues = "${rabbitmq.queue.order-placed:order.placed.queue}")
    public void handleOrderPlaced(OrderPlacedEvent event) {
        log.info("Received order.placed event for order {}", event.getOrderId());

        // 1. Customer confirmation email (existing behaviour — unchanged)
        emailService.sendOrderConfirmation(event);

        // 2. Seller notifications — one email per seller product in the order.
        //    Admin-created products have no sellerNotification entry, so the loop
        //    simply skips them. If the list is null (legacy message), guard with isEmpty check.
        if (event.getSellerNotifications() == null || event.getSellerNotifications().isEmpty()) {
            log.debug("Order {} has no seller notifications to send", event.getOrderId());
            return;
        }

        for (OrderPlacedEvent.SellerNotification sn : event.getSellerNotifications()) {
            log.info("Sending seller notification to {} for product '{}' (remaining stock: {})",
                sn.getSellerEmail(), sn.getProductName(), sn.getRemainingStock());

            emailService.sendSellerOrderNotification(sn);

            if (sn.getRemainingStock() < 10) {
                log.info("Low stock alert triggered for '{}' — {} units left, notifying {}",
                    sn.getProductName(), sn.getRemainingStock(), sn.getSellerEmail());
                emailService.sendLowStockAlert(sn);
            }
        }
    }

    @RabbitListener(queues = "${rabbitmq.queue.order-shipped:order.shipped.queue}")
    public void handleOrderShipped(OrderPlacedEvent event) {
        log.info("Received order.shipped event for order {}", event.getOrderId());
        emailService.sendOrderShipped(event);
    }
}
