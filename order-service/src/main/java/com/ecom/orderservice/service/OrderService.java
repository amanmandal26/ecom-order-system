package com.ecom.orderservice.service;

import com.ecom.orderservice.client.ProductClient;
import com.ecom.orderservice.dto.*;
import com.ecom.orderservice.entity.Order;
import com.ecom.orderservice.entity.OrderItem;
import com.ecom.orderservice.entity.OrderStatus;
import com.ecom.orderservice.exception.InsufficientStockException;
import com.ecom.orderservice.exception.OrderCancellationException;
import com.ecom.orderservice.exception.ResourceNotFoundException;
import com.ecom.orderservice.repository.OrderRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    public OrderResponse placeOrder(OrderRequest request, Long userId, String userEmail) {
        log.info("Placing order for userId={} email={}", userId, userEmail);

        List<OrderItem> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var itemRequest : request.getItems()) {
            // Call product-service to get current price and verify the product exists.
            ProductResponse product = productClient
                .getProductById(itemRequest.getProductId()).getData();

            if (product == null) {
                throw new ResourceNotFoundException("Product", itemRequest.getProductId());
            }

            // Reduce stock via Feign. product-service throws 400 if insufficient —
            // FeignException is caught here and re-thrown as our domain exception.
            try {
                productClient.reduceStock(itemRequest.getProductId(),
                    new StockRequest(itemRequest.getQuantity()));
            } catch (FeignException.BadRequest ex) {
                throw new InsufficientStockException(
                    "Insufficient stock for product: " + product.getName());
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
        return OrderResponse.fromOrder(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream()
            .map(OrderResponse::fromOrder)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrdersByEmail(String userEmail) {
        return orderRepository.findByUserEmailOrderByCreatedAtDesc(userEmail)
            .stream()
            .map(OrderResponse::fromOrder)
            .toList();
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
            productClient.restoreStock(item.getProductId(),
                new StockRequest(item.getQuantity()));
        }

        log.info("Order {} cancelled by userId={}", id, userId);
        return OrderResponse.fromOrder(order);
    }

    private Order findOrderOrThrow(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Order", id));
    }
}
