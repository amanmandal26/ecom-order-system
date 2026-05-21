package com.ecom.orderservice.controller;

import com.ecom.orderservice.dto.ApiResponse;
import com.ecom.orderservice.dto.OrderRequest;
import com.ecom.orderservice.dto.OrderResponse;
import com.ecom.orderservice.entity.OrderStatus;
import com.ecom.orderservice.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> placeOrder(
            @Valid @RequestBody OrderRequest request,
            HttpServletRequest httpRequest) {

        Long userId = (Long) httpRequest.getAttribute("userId");
        String userEmail = resolveEmail(httpRequest);

        // userId is embedded in the JWT by user-service. If it's missing the token
        // was issued before that change — a fresh login produces a valid token.
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Your session token is outdated. Please login again to get a new token."));
        }

        log.info("User {} placing order", userEmail);
        OrderResponse response = orderService.placeOrder(request, userId, userEmail);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Order placed successfully", response));
    }

    @GetMapping("/my-orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getMyOrders(HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String userEmail = resolveEmail(httpRequest);

        // Fall back to email-based lookup when token pre-dates the userId claim.
        List<OrderResponse> orders = (userId != null)
            ? orderService.getMyOrders(userId)
            : orderService.getMyOrdersByEmail(userEmail);

        return ResponseEntity.ok(ApiResponse.ok("Orders fetched successfully", orders));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String role = (String) httpRequest.getAttribute("role");
        String userEmail = resolveEmail(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Order fetched successfully",
            orderService.getOrderById(id, userId, userEmail, role)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        log.info("Admin updating order {} to {}", id, status);
        return ResponseEntity.ok(ApiResponse.ok("Order status updated successfully",
            orderService.updateOrderStatus(id, status)));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String userEmail = resolveEmail(httpRequest);
        log.info("User {} cancelling order {}", userEmail, id);
        return ResponseEntity.ok(ApiResponse.ok("Order cancelled successfully",
            orderService.cancelOrder(id, userId, userEmail)));
    }

    // Reads userEmail from request attribute (set by JwtAuthFilter).
    // Falls back to SecurityContext principal if the attribute is somehow missing.
    private String resolveEmail(HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("userEmail");
        if (email == null) {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            email = principal instanceof String ? (String) principal : principal.toString();
        }
        return email;
    }
}
