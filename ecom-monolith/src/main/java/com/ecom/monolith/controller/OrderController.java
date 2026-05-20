package com.ecom.monolith.controller;

import com.ecom.monolith.dto.ApiResponse;
import com.ecom.monolith.dto.OrderRequest;
import com.ecom.monolith.dto.OrderResponse;
import com.ecom.monolith.entity.OrderStatus;
import com.ecom.monolith.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * OrderController — REST API for the order lifecycle.
 *
 * Access rules:
 *  POST /api/orders              — any authenticated user (place an order)
 *  GET  /api/orders/my-orders    — any authenticated user (own orders only)
 *  GET  /api/orders/{id}         — owner or ADMIN (checked in service)
 *  PUT  /api/orders/{id}/status  — ADMIN only (advance order status)
 *  PUT  /api/orders/{id}/cancel  — owner only (PENDING orders only, checked in service)
 *
 * @AuthenticationPrincipal injects the logged-in user's UserDetails (email = username).
 * The service does the ownership/role checks that can't be expressed purely with @PreAuthorize.
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    /**
     * POST /api/orders
     * Place a new order. Stock is reduced and a PENDING order is created.
     * Returns 201 Created with the saved order.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> placeOrder(
            @Valid @RequestBody OrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("User {} placing a new order", userDetails.getUsername());
        OrderResponse response = orderService.placeOrder(request, userDetails.getUsername());
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Order placed successfully", response));
    }

    /**
     * GET /api/orders/my-orders
     * Returns all orders for the authenticated user, newest first.
     */
    @GetMapping("/my-orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getMyOrders(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<OrderResponse> orders = orderService.getMyOrders(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Orders fetched successfully", orders));
    }

    /**
     * GET /api/orders/{id}
     * Returns the order if the caller is the owner or an ADMIN.
     * Service throws AccessDeniedException (-> 403) if neither.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        OrderResponse order = orderService.getOrderById(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Order fetched successfully", order));
    }

    /**
     * PUT /api/orders/{id}/status?status=CONFIRMED
     * Move an order to any status. ADMIN only.
     * Spring converts the ?status= query param to the OrderStatus enum automatically.
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        log.info("Admin updating order {} to status {}", id, status);
        OrderResponse order = orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok("Order status updated successfully", order));
    }

    /**
     * PUT /api/orders/{id}/cancel
     * Cancel a PENDING order and restore stock. Owner only.
     * Service throws OrderCancellationException (-> 400) if status is not PENDING.
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("User {} cancelling order {}", userDetails.getUsername(), id);
        OrderResponse order = orderService.cancelOrder(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Order cancelled successfully", order));
    }
}
