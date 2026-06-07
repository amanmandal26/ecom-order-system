package com.ecom.orderservice.service;

import com.ecom.orderservice.client.ProductClient;
import com.ecom.orderservice.config.RabbitMQConfig;
import com.ecom.orderservice.dto.*;
import com.ecom.orderservice.entity.Order;
import com.ecom.orderservice.entity.OrderItem;
import com.ecom.orderservice.entity.OrderStatus;
import com.ecom.orderservice.event.OrderPlacedEvent;
import com.ecom.orderservice.exception.BadRequestException;
import com.ecom.orderservice.exception.InsufficientStockException;
import com.ecom.orderservice.exception.OrderCancellationException;
import com.ecom.orderservice.exception.ResourceNotFoundException;
import com.ecom.orderservice.exception.SellerActionException;
import com.ecom.orderservice.exception.ServiceUnavailableException;
import com.ecom.orderservice.repository.OrderRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import feign.FeignException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.AmqpTemplate;
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
    private final AmqpTemplate rabbitTemplate;

    @CircuitBreaker(name = "productService", fallbackMethod = "placeOrderFallback")
    public OrderResponse placeOrder(OrderRequest request, Long userId, String userEmail) {
        log.info("Placing order for userId={} email={}", userId, userEmail);

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Order must contain at least one item");
        }

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
                .sellerEmail(product.getSellerEmail())
                .sellerName(product.getSellerName())
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
    @SuppressWarnings("unused")
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

    @Transactional(readOnly = true)
    public PagedResponse<SellerOrderResponse> getSellerOrders(String sellerEmail, int page, int size) {
        Page<Order> orderPage = orderRepository.findOrdersBySellerEmail(
            sellerEmail,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        // Flatten: one row per item belonging to this seller in each order.
        // Pagination counts are order-based (not item-based) — a single order with
        // 2 seller items produces 2 rows on the same page.
        List<SellerOrderResponse> rows = orderPage.getContent().stream()
            .flatMap(order -> order.getOrderItems().stream()
                .filter(item -> sellerEmail.equals(item.getSellerEmail()))
                .map(item -> SellerOrderResponse.builder()
                    .orderId(order.getId())
                    .orderDate(order.getCreatedAt())
                    .customerEmail(order.getUserEmail())
                    .status(order.getStatus())
                    .totalAmount(order.getTotalAmount())
                    .productId(item.getProductId())
                    .productName(item.getProductName())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .subtotal(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .sellerEmail(item.getSellerEmail())
                    .sellerName(item.getSellerName())
                    .build()))
            .toList();

        return PagedResponse.<SellerOrderResponse>builder()
            .content(rows)
            .currentPage(orderPage.getNumber())
            .pageSize(orderPage.getSize())
            .totalItems(orderPage.getTotalElements())
            .totalPages(orderPage.getTotalPages())
            .first(orderPage.isFirst())
            .last(orderPage.isLast())
            .hasNext(orderPage.hasNext())
            .hasPrevious(orderPage.hasPrevious())
            .build();
    }

    public OrderResponse updateOrderStatusBySeller(Long orderId, OrderStatus newStatus, String sellerEmail) {
        log.info("Seller {} updating order {} to {}", sellerEmail, orderId, newStatus);
        Order order = findOrderOrThrow(orderId);

        // Seller must own at least one product in this order
        boolean sellerOwnsItem = order.getOrderItems().stream()
            .anyMatch(item -> sellerEmail.equals(item.getSellerEmail()));
        if (!sellerOwnsItem) {
            throw new AccessDeniedException("You do not have any products in this order");
        }

        // Only CONFIRMED and SHIPPED are valid for seller-initiated updates
        if (newStatus != OrderStatus.CONFIRMED && newStatus != OrderStatus.SHIPPED) {
            throw new SellerActionException("Sellers can only confirm or ship orders");
        }

        OrderStatus current = order.getStatus();
        if (newStatus == OrderStatus.CONFIRMED && current != OrderStatus.PENDING) {
            throw new SellerActionException(
                "Order can only be confirmed when it is PENDING. Current status: " + current);
        }
        if (newStatus == OrderStatus.SHIPPED && current != OrderStatus.CONFIRMED) {
            throw new SellerActionException(
                "Order can only be shipped when it is CONFIRMED. Current status: " + current);
        }

        order.setStatus(newStatus);

        if (newStatus == OrderStatus.SHIPPED) {
            String sellerName = order.getOrderItems().stream()
                .filter(item -> sellerEmail.equals(item.getSellerEmail()))
                .map(OrderItem::getSellerName)
                .filter(n -> n != null && !n.isBlank())
                .findFirst()
                .orElse(sellerEmail);

            OrderPlacedEvent event = buildShippedEvent(order, sellerName);
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.KEY_SHIPPED, event);
            log.info("Published order.shipped event for order {} by seller '{}'", orderId, sellerName);
        }

        return OrderResponse.fromOrder(orderRepository.save(order));
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

    // Builds the event published when a seller marks an order as shipped.
    // Carries sellerName so the notification-service can say "Shipped by: {seller}".
    private OrderPlacedEvent buildShippedEvent(Order order, String sellerName) {
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
            .sellerName(sellerName)
            .sellerNotifications(new ArrayList<>())
            .build();
    }
}
