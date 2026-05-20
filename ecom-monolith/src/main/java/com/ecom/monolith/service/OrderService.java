package com.ecom.monolith.service;

import com.ecom.monolith.dto.OrderRequest;
import com.ecom.monolith.dto.OrderResponse;
import com.ecom.monolith.entity.*;
import com.ecom.monolith.exception.OrderCancellationException;
import com.ecom.monolith.exception.ResourceNotFoundException;
import com.ecom.monolith.repository.OrderRepository;
import com.ecom.monolith.repository.ProductRepository;
import com.ecom.monolith.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;

    /**
     * Place a new order for the authenticated user.
     *
     * All stock reductions happen inside this single transaction. If any product
     * has insufficient stock, the exception rolls back every stock change already
     * made in the loop — the DB is never left in a partially-reduced state.
     */
    public OrderResponse placeOrder(OrderRequest request, String userEmail) {
        log.info("Placing order for user: {}", userEmail);

        User user = findUserOrThrow(userEmail);

        List<OrderItem> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", itemRequest.getProductId()));

            // Reduce stock atomically. Throws InsufficientStockException if not enough,
            // which rolls back the whole transaction (no partial reductions survive).
            productService.reduceStock(product.getId(), itemRequest.getQuantity());

            // Snapshot the current price — order history must reflect what the customer paid,
            // not what the product costs in the future.
            BigDecimal unitPrice = product.getPrice();
            totalAmount = totalAmount.add(unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity())));

            items.add(OrderItem.builder()
                .product(product)
                .quantity(itemRequest.getQuantity())
                .unitPrice(unitPrice)
                .build());
        }

        Order order = Order.builder()
            .user(user)
            .status(OrderStatus.PENDING)
            .totalAmount(totalAmount)
            .orderItems(new ArrayList<>())
            .build();

        // Link each item back to the parent order before saving.
        // JPA cascade (CascadeType.ALL on Order.orderItems) will then save the items.
        for (OrderItem item : items) {
            item.setOrder(order);
            order.getOrderItems().add(item);
        }

        order = orderRepository.save(order);
        log.info("Order {} placed successfully for user: {}", order.getId(), userEmail);
        return OrderResponse.fromOrder(order);
    }

    /**
     * Return all orders for the authenticated user, newest first.
     */
    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(String userEmail) {
        User user = findUserOrThrow(userEmail);
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(OrderResponse::fromOrder)
            .toList();
    }

    /**
     * Return a single order by id.
     * A CUSTOMER can only view their own orders. An ADMIN can view any order.
     */
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id, String userEmail) {
        Order order = findOrderOrThrow(id);
        User user = findUserOrThrow(userEmail);

        boolean isOwner = order.getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("You do not have permission to view this order");
        }

        return OrderResponse.fromOrder(order);
    }

    /**
     * Update an order's status. ADMIN only — enforced by @PreAuthorize in the controller.
     */
    public OrderResponse updateOrderStatus(Long id, OrderStatus status) {
        log.info("Updating order {} status to {}", id, status);
        Order order = findOrderOrThrow(id);
        order.setStatus(status);
        // No explicit save() — @Transactional detects the dirty entity and flushes on commit.
        return OrderResponse.fromOrder(order);
    }

    /**
     * Cancel a PENDING order and restore stock for all items.
     * Only the order owner can cancel (ADMIN uses updateOrderStatus instead).
     */
    public OrderResponse cancelOrder(Long id, String userEmail) {
        Order order = findOrderOrThrow(id);
        User user = findUserOrThrow(userEmail);

        if (!order.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to cancel this order");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new OrderCancellationException(id, order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);

        for (OrderItem item : order.getOrderItems()) {
            productService.restoreStock(item.getProduct().getId(), item.getQuantity());
        }

        log.info("Order {} cancelled by user: {}", id, userEmail);
        return OrderResponse.fromOrder(order);
    }

    private User findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }

    private Order findOrderOrThrow(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Order", id));
    }
}
