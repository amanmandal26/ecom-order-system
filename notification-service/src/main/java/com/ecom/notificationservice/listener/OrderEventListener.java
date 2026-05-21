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
        log.info("Received order placed event for order: {}", event.getOrderId());
        emailService.sendOrderConfirmation(event);
    }

    @RabbitListener(queues = "${rabbitmq.queue.order-shipped:order.shipped.queue}")
    public void handleOrderShipped(OrderPlacedEvent event) {
        log.info("Received order shipped event for order: {}", event.getOrderId());
        emailService.sendOrderShipped(event);
    }
}
