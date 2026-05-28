package com.ecom.orderservice.service;

import com.ecom.orderservice.client.ProductClient;
import com.ecom.orderservice.config.RabbitMQConfig;
import com.ecom.orderservice.dto.*;
import com.ecom.orderservice.entity.Order;
import com.ecom.orderservice.entity.OrderItem;
import com.ecom.orderservice.entity.OrderStatus;
import com.ecom.orderservice.event.OrderPlacedEvent;
import com.ecom.orderservice.exception.InsufficientStockException;
import com.ecom.orderservice.exception.OrderCancellationException;
import com.ecom.orderservice.exception.ResourceNotFoundException;
import com.ecom.orderservice.exception.ServiceUnavailableException;
import com.ecom.orderservice.repository.OrderRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import feign.FeignException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductClient productClient;
    private final RabbitTemplate rabbitTemplate;

    @CircuitBreaker(name = "productService", fallbackMethod = "placeOrderFallback")
    public OrderResponse placeOrder(OrderRequest request, Long userId, String userEmail) {
        log.info("Placing order for userId={} email={}", userId, userEmail);

        List<OrderItem> items = new ArrayList<>();
        List<OrderPlacedEvent.SellerNotification> sellerNotifications = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var itemRequest : request.getItems()) {
            // Fetch current price and seller identity before touching stock
            ProductResponse product = productClient
                .getProductById(itemRequest.getProductId()).getData();

            if (product == null) {
                throw new ResourceNotFoundException("Product", itemRequest.getProductId());
            }

            // Reduce stock — now returns the product with updated stockQuantity so we
            // get remaining stock in one Feign call instead of two.
            ProductResponse updatedProduct;
            try {
                updatedProduct = productClient
                    .reduceStock(itemRequest.getProductId(), new StockRequest(itemRequest.getQuantity()))
                    .getData();
            } catch (FeignException.BadRequest ex) {
                throw new InsufficientStockException(
                    "Insufficient stock for product: " + product.getName());
            }

            int remainingStock = updatedProduct != null ? updatedProduct.getStockQuantity() : 0;

            // Build seller notification only for seller-owned products.
            // Admin-created products have null sellerEmail — skip them silently.
            if (product.getSellerEmail() != null && !product.getSellerEmail().isBlank()) {
                sellerNotifications.add(OrderPlacedEvent.SellerNotification.builder()
                    .sellerEmail(product.getSellerEmail())
                    .sellerName(product.getSellerName())
                    .productName(product.getName())
                    .quantityOrdered(itemRequest.getQuantity())
                    .unitPrice(product.getPrice())
                    .customerEmail(userEmail)
                    .remainingStock(remainingStock)
                    .build());
            }

            BigDecimal unitPrice = product.getPrice();
            totalAmount = totalAmount.add(unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity())));

            items.add(OrderItem.builder()
                .productId(product.getId())
                .productName(product.getName())
                .quantity(itemRequest.getQuantity())
                .unitPrice(unitPrice)
                .build());
        }

        Order order = Order.builder()
            .userId(userId)
            .userEmail(userEmail)
            .status(OrderStatus.PENDING)
            .totalAmount(totalAmount)
            .orderItems(new ArrayList<>())
            .build();

        for (OrderItem item : items) {
            item.setOrder(order);
            order.getOrderItems().add(item);
        }

        order = orderRepository.save(order);
        log.info("Order {} placed for userId={}", order.getId(), userId);

        OrderPlacedEvent event = buildEvent(order, sellerNotifications);
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.KEY_PLACED, event);
        log.info("Published order.placed event for order {} with {} seller notification(s)",
            order.getId(), sellerNotifications.size());

        return OrderResponse.fromOrder(order);
    }

    // Resilience4j calls this when the circuit is OPEN or the decorated method throws.
    // Signature must match placeOrder exactly, with an extra Exception parameter at the end.
    private OrderResponse placeOrderFallback(OrderRequest request, Long userId, String userEmail, Exception ex) {
        log.error("Circuit breaker open — product service unavailable. userId={} cause={}", userId, ex.getMessage());
        throw new ServiceUnavailableException(
            "Product service is temporarily unavailable. Please try again in a few minutes.");
    }

    @Transactional(readOnly = true)
    public PagedResponse<OrderResponse> getMyOrders(Long userId, int page, int size) {
        return PagedResponse.of(
            orderRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(OrderResponse::fromOrder)
        );
    }

    @Transactional(readOnly = true)
    public PagedResponse<OrderResponse> getMyOrdersByEmail(String userEmail, int page, int size) {
        return PagedResponse.of(
            orderRepository.findByUserEmailOrderByCreatedAtDesc(userEmail, PageRequest.of(page, size))
                .map(OrderResponse::fromOrder)
        );
    }

    @Transactional(readOnly = true)
    public PagedResponse<OrderResponse> getAllOrders(int page, int size) {
        return PagedResponse.of(
            orderRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(OrderResponse::fromOrder)
        );
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id, Long userId, String userEmail, String role) {
        Order order = findOrderOrThrow(id);

        boolean isOwner = (userId != null && order.getUserId().equals(userId))
            || order.getUserEmail().equals(userEmail);
        boolean isAdmin = "ADMIN".equals(role);

        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("You do not have permission to view this order");
        }

        return OrderResponse.fromOrder(order);
    }

    public OrderResponse updateOrderStatus(Long id, OrderStatus status) {
        log.info("Updating order {} to status {}", id, status);
        Order order = findOrderOrThrow(id);
        order.setStatus(status);

        if (status == OrderStatus.SHIPPED) {
            // Shipped event carries no seller notifications — empty list is fine
            OrderPlacedEvent event = buildEvent(order, List.of());
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.KEY_SHIPPED, event);
            log.info("Published order.shipped event for order {}", order.getId());
        }

        return OrderResponse.fromOrder(order);
    }

    public OrderResponse cancelOrder(Long id, Long userId, String userEmail) {
        Order order = findOrderOrThrow(id);

        boolean isOwner = (userId != null && order.getUserId().equals(userId))
            || order.getUserEmail().equals(userEmail);
        if (!isOwner) {
            throw new AccessDeniedException("You do not have permission to cancel this order");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new OrderCancellationException(id, order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);

        // Restore stock for every item. If any restore fails, the whole transaction
        // rolls back and the cancellation does not take effect.
        for (OrderItem item : order.getOrderItems()) {
            productClient.restoreStock(item.getProductId(), new StockRequest(item.getQuantity()));
        }

        log.info("Order {} cancelled by userId={}", id, userId);
        return OrderResponse.fromOrder(order);
    }

    private Order findOrderOrThrow(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Order", id));
    }

    private OrderPlacedEvent buildEvent(Order order,
                                        List<OrderPlacedEvent.SellerNotification> sellerNotifications) {
        List<OrderPlacedEvent.OrderItemInfo> itemInfos = order.getOrderItems().stream()
            .map(item -> OrderPlacedEvent.OrderItemInfo.builder()
                .productName(item.getProductName())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .build())
            .toList();

        return OrderPlacedEvent.builder()
            .orderId(order.getId())
            .userEmail(order.getUserEmail())
            .userName(order.getUserEmail())
            .totalAmount(order.getTotalAmount())
            .items(itemInfos)
            .sellerNotifications(new ArrayList<>(sellerNotifications))
            .build();
    }
}
